/**
 * googleAccountPopup.js — copy buttons for the Google Account popup.
 *
 * Core insight: the popup card has overflow:hidden at multiple levels,
 * so any button inserted inside its DOM tree is clipped invisible.
 *
 * Fix: position:fixed overlay buttons appended to <body> directly.
 * They are positioned using getBoundingClientRect() of the email element
 * so they appear right next to the email text, but live outside the popup
 * stacking context — no CSS can clip them.
 *
 * Flow:
 *  1. Watch aria-expanded on the profile button (it carries the email in
 *     its aria-label and toggles when the popup opens/closes).
 *  2. On open → find the email text in the DOM → place position:fixed button.
 *  3. On close → remove the overlay button.
 *  4. Also add a small permanent copy icon next to the profile avatar itself
 *     (in the Google Bar), so email is always one click away.
 */

const CGA_GoogleAccountPopup = (() => {
  const WATCHED = 'data-cga-gb-watch'; // profile button already wired up

  // ── Module-level overlay state ──────────────────────────────────────────────
  let _overlayBtns   = [];   // currently visible position:fixed buttons
  let _closeWatcher  = null; // MutationObserver watching for popup close
  let _clickAwayCb   = null; // click-away listener

  // ── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    const settings = await _getSettings();
    if (!settings.enableAccountPopup) return;

    // Wire up any profile buttons already in the DOM
    _findAndWatchButtons(document.body);

    // Body-wide aria-expanded watcher — catches buttons we haven't individually
    // watched yet (e.g. loaded after us, or inside dynamically added nodes).
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName !== 'aria-expanded') continue;
        const el = m.target;
        const email = _emailFromEl(el);
        if (!email) continue;
        if (el.getAttribute('aria-expanded') === 'true') {
          _onPopupOpen(email, el);
        } else {
          _removeOverlays();
        }
      }
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-expanded'],
      subtree: true,
    });

    // Re-scan for new profile buttons added after init (SPA navigation)
    CGA_Observer.register((addedNodes) => {
      addedNodes.forEach(n => _findAndWatchButtons(n));
    });
  }

  // ── Find & wire profile buttons ─────────────────────────────────────────────

  function _findAndWatchButtons(root) {
    const sel = '[aria-expanded][aria-label*="@"], [aria-expanded][data-email]';
    const els = [];
    try {
      if (root.matches?.(sel)) els.push(root);
      root.querySelectorAll?.(sel).forEach(e => els.push(e));
    } catch {}
    els.forEach(_wireButton);
  }

  function _wireButton(el) {
    if (el.hasAttribute(WATCHED)) return;
    const email = _emailFromEl(el);
    if (!email) return;

    el.setAttribute(WATCHED, 'true');

    // Permanent tiny copy icon next to the avatar in the Google Bar
    _addBarIcon(el, email);

    // If already open on page load, inject immediately
    if (el.getAttribute('aria-expanded') === 'true') {
      _onPopupOpen(email, el);
    }

    // Per-button watcher (more reliable than the body-wide one for this button)
    new MutationObserver(() => {
      if (el.getAttribute('aria-expanded') === 'true') {
        _onPopupOpen(email, el);
      } else {
        _removeOverlays();
      }
    }).observe(el, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  // Always-visible copy icon in the Google Bar next to the profile avatar.
  // NOT hover-only — bar icons are permanent toolbar elements, not inline chips.
  function _addBarIcon(triggerEl, email) {
    if (triggerEl.parentElement?.querySelector('[data-cga-bar-icon]')) return;
    const btn = CGA_CopyButton.create({ email, hoverOnly: false });
    btn.setAttribute('data-cga-bar-icon', 'true');
    btn.style.verticalAlign = 'middle';
    triggerEl.insertAdjacentElement('afterend', btn);
  }

  // ── Popup open handler ──────────────────────────────────────────────────────

  function _onPopupOpen(email, triggerEl) {
    _removeOverlays();

    // Try placing overlays at increasing delays — popup DOM builds in phases
    [100, 350, 800, 1500].forEach(delay => {
      setTimeout(() => {
        if (triggerEl.getAttribute('aria-expanded') === 'true') {
          _placeOverlays(email);
        }
      }, delay);
    });

    _watchForClose(triggerEl);
  }

  // ── Position:fixed overlay placement ───────────────────────────────────────

  function _placeOverlays(email) {
    const lower = email.toLowerCase();
    const placed = new Set(); // deduplicate by vertical screen position

    // Strategy A: textScanner already processed this email → find [data-cga-email] spans
    document.querySelectorAll(`[data-cga-email]`).forEach(span => {
      if (span.getAttribute('data-cga-email') !== lower) return;
      _tryPlace(span, email, placed);
    });

    // Strategy B: raw text nodes not yet processed by textScanner
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!(node.nodeValue || '').toLowerCase().includes(lower))
          return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        // Skip inside our own injected elements
        if (_isInsideCGA(p)) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (['SCRIPT','STYLE','INPUT','TEXTAREA','BUTTON'].includes(tag))
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      _tryPlace(node.parentElement, email, placed);
    }
  }

  function _tryPlace(el, email, placed) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Skip if not visible (rect.width===0 means element is display:none or truly hidden)
    if (rect.width === 0 || rect.height === 0) return;

    const key = Math.round(rect.top); // group by vertical position
    if (placed.has(key)) return;
    placed.add(key);

    // Don't re-place if we already have an overlay at this row
    const already = _overlayBtns.some(b => {
      const br = b.getBoundingClientRect();
      return Math.abs(br.top - rect.top) < 8;
    });
    if (already) return;

    const btn = CGA_CopyButton.create({ email, hoverOnly: false });
    btn.setAttribute('data-cga-overlay', 'true');

    // position:fixed → renders relative to viewport, escapes ALL overflow:hidden
    const top  = Math.round(rect.top  + (rect.height - 22) / 2);
    const left = Math.round(rect.right + 6);
    btn.style.cssText = [
      'position:fixed',
      `top:${top}px`,
      `left:${left}px`,
      'z-index:2147483647',
      'margin:0',
    ].join('!important;') + '!important';

    document.body.appendChild(btn);
    _overlayBtns.push(btn);
  }

  function _isInsideCGA(el) {
    try {
      return !!el.closest(
        '[data-cga-wrap],[data-cga-btn],[data-cga-overlay],[data-cga-bar-icon]'
      );
    } catch { return false; }
  }

  // ── Overlay cleanup ─────────────────────────────────────────────────────────

  function _removeOverlays() {
    _overlayBtns.forEach(b => { try { b.remove(); } catch {} });
    _overlayBtns = [];

    if (_closeWatcher) { _closeWatcher.disconnect(); _closeWatcher = null; }
    if (_clickAwayCb) {
      document.removeEventListener('click', _clickAwayCb, true);
      _clickAwayCb = null;
    }
  }

  function _watchForClose(triggerEl) {
    // 1. aria-expanded flips back to false
    _closeWatcher = new MutationObserver(() => {
      if (triggerEl.getAttribute('aria-expanded') !== 'true') _removeOverlays();
    });
    _closeWatcher.observe(triggerEl, {
      attributes: true,
      attributeFilter: ['aria-expanded'],
    });

    // 2. Click anywhere outside the popup (with a grace period so the opening
    //    click doesn't immediately close it)
    setTimeout(() => {
      _clickAwayCb = (e) => {
        // Keep overlays alive if user clicked inside our overlay button or trigger
        if (e.target.closest('[data-cga-overlay],[data-cga-bar-icon]')) return;
        if (e.target.closest('[aria-expanded]')) return;
        _removeOverlays();
      };
      document.addEventListener('click', _clickAwayCb, true);
    }, 400);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _emailFromEl(el) {
    const src = el.getAttribute('aria-label') || el.getAttribute('data-email') || el.getAttribute('title') || '';
    return CGA_Utils.extractEmails(src)[0] || null;
  }

  async function _getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({ enableAccountPopup: true }, resolve);
    });
  }

  return { init };
})();

CGA_GoogleAccountPopup.init();
