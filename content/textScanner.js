/**
 * textScanner.js — universal email detector.
 *
 * Walks every text node on the page with a TreeWalker and, for any text that
 * contains an email address, splits the text node and:
 *   - wraps the email in a <span> (clickable when "click to copy" is on)
 *   - inserts a copy button immediately after the span
 *
 * Works on any page regardless of class names or DOM structure.
 *
 * Reliability strategy for dynamic popups (e.g. Google Account popup):
 *   1. Initial scan at document_idle
 *   2. Delayed rescans (500 ms, 1.5 s, 4 s) catch content loaded after idle
 *   3. Click listener: any click → scan body 350 ms later (catches popups
 *      that appear via visibility toggle, not DOM insertion)
 *   4. MutationObserver via CGA_Observer for all other dynamic additions
 */

const CGA_TextScanner = (() => {

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'HEAD',
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  ]);

  // Subtrees already handled by other modules — never double-inject
  const GUARD_SELECTORS = [
    '[data-cga-gmail]',
    '[data-cga-detected]',
    '[data-cga-popup]',
    '[data-cga-wrap]',
    '[data-cga-scanned]',
    '[data-cga-btn]',
  ];

  const EMAIL_PAT = '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}';

  // ── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    const settings = await _getSettings();
    if (!settings.enableAutoDetect) return;

    // 1. Immediate scan
    _scan(document.body, settings);

    // 2. Delayed rescans — Gmail loads content long after document_idle
    [500, 1500, 4000].forEach(ms => {
      setTimeout(() => {
        _getSettings().then(s => { if (s.enableAutoDetect) _scan(document.body, s); });
      }, ms);
    });

    // 3. Click listener — catches popups that are shown via CSS visibility
    //    toggle (no DOM mutation fires, so MutationObserver misses them)
    let clickTimer;
    document.addEventListener('click', () => {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        _getSettings().then(s => { if (s.enableAutoDetect) _scan(document.body, s); });
      }, 350);
    }, true /* capture: fires before any element handlers */);

    // 4. MutationObserver for dynamically added nodes
    CGA_Observer.register((addedNodes) => {
      _getSettings().then(s => {
        if (!s.enableAutoDetect) return;
        // Scan each added node AND its parent — popup content may load in
        // phases where the email lands in a node added in an earlier batch
        const roots = new Set();
        addedNodes.forEach(n => {
          roots.add(n);
          if (n.parentElement && n.parentElement !== document.body) {
            roots.add(n.parentElement);
          }
        });
        roots.forEach(n => _scan(n, s));
      });
    });
  }

  // ── Scan a subtree ──────────────────────────────────────────────────────────

  function _scan(root, settings) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    // Collect first, mutate after — never modify the DOM mid-TreeWalker
    const textNodes = _collectTextNodes(root);
    textNodes.forEach(node => _processTextNode(node, settings));
  }

  function _collectTextNodes(root) {
    const nodes = [];
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        _filterNode   // pass function directly for broad browser compatibility
      );
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
    } catch { /* root may have been removed from DOM mid-walk */ }
    return nodes;
  }

  function _filterNode(node) {
    const parent = node.parentElement;
    if (!parent) return NodeFilter.FILTER_REJECT;

    // Skip subtrees already handled by other modules or already scanned
    for (const sel of GUARD_SELECTORS) {
      try { if (parent.closest(sel)) return NodeFilter.FILTER_REJECT; } catch {}
    }

    // Skip non-visible / structural tags
    let el = parent;
    while (el) {
      if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      el = el.parentElement;
    }

    // Fast pre-filter before running regex
    if (!node.nodeValue.includes('@')) return NodeFilter.FILTER_REJECT;

    // Fresh regex each time — no /g lastIndex contamination
    return new RegExp(EMAIL_PAT).test(node.nodeValue)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT;
  }

  // ── Process a single text node ──────────────────────────────────────────────

  function _processTextNode(textNode, settings) {
    if (!textNode.parentNode) return;   // already detached

    const parent = textNode.parentElement;
    if (!parent) return;

    // Re-validate guards — DOM may have changed since collect
    for (const sel of GUARD_SELECTORS) {
      try { if (parent.closest(sel)) return; } catch {}
    }

    const text = textNode.nodeValue;
    const regex = new RegExp(EMAIL_PAT, 'g');
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let foundAny = false;

    while ((match = regex.exec(text)) !== null) {
      foundAny = true;
      const rawEmail = match[0];
      const email    = rawEmail.toLowerCase();

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // ── Email span ────────────────────────────────────────────────────────
      const emailSpan = document.createElement('span');
      emailSpan.setAttribute('data-cga-wrap', 'true');
      emailSpan.setAttribute('data-cga-email', email);
      emailSpan.className = 'cga-email-text';
      emailSpan.textContent = rawEmail;

      if (settings.clickToCopy) {
        emailSpan.classList.add('cga-email-clickable');
        emailSpan.title = 'Click to copy';
        emailSpan.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await CGA_Clipboard.copy(email);
          if (ok) _showClickFeedback(emailSpan);
        });
      }

      fragment.appendChild(emailSpan);

      // ── Copy button right after the span ─────────────────────────────────
      const btn = CGA_CopyButton.create({ email, hoverOnly: settings.hoverOnly || false });
      fragment.appendChild(btn);

      lastIndex = match.index + rawEmail.length;
    }

    if (!foundAny) return;

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    // Mark BEFORE mutating DOM so re-entrant observer calls skip this parent
    parent.setAttribute('data-cga-scanned', 'true');
    try {
      textNode.parentNode.replaceChild(fragment, textNode);
    } catch { /* parent may have been removed between collect and now */ }
  }

  // ── Click-to-copy feedback ──────────────────────────────────────────────────

  function _showClickFeedback(span) {
    span.classList.add('cga-email-copied');
    const prev = span.title;
    span.title = 'Copied!';
    setTimeout(() => {
      span.classList.remove('cga-email-copied');
      span.title = prev;
    }, 1500);
  }

  async function _getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({
        enableAutoDetect: true,
        clickToCopy: true,
        hoverOnly: false,
      }, resolve);
    });
  }

  return { init };
})();

CGA_TextScanner.init();
