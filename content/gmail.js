/**
 * gmail.js — Gmail-specific copy button injection.
 * Handles: sender chips, recipient chips (To/CC/BCC), message details panel,
 * expanded header, and "Copy All Recipients" button.
 */

const CGA_Gmail = (() => {
  const PROCESSED = 'data-cga-gmail';
  const isGmail = location.hostname === 'mail.google.com';

  // ── Selectors ──────────────────────────────────────────────────────────────
  // Gmail uses [email] attribute on chip spans — most reliable signal across versions.
  // We also cover data-hovercard-id as a fallback for newer Gmail.
  const CHIP_SEL = [
    'span[email]',
    'div[email]',
    'span[data-hovercard-id]',
    '.gD[email]',
    '.g2[email]',
    '.go[email]',
    '.zF[email]',
    '.afV[email]',
    '.aJ6[email]',
    '.yP[email]',
    '.zA[email]',
    '[data-legacy-message-id] span[email]',
  ];

  const RECIPIENT_AREA_SEL = '.aoD, .aZ6, .bA3, .aXp, .lS';
  const DETAIL_PANEL_SEL = '.iw, .bzB, .hN';

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    if (!isGmail) return;
    const settings = await _getSettings();
    if (!settings.enableGmail) return;

    // Initial scan — Gmail may already have some chips at document_idle
    _scan(document.body);

    // Re-scan on every DOM batch (handles conversation thread loading)
    CGA_Observer.register((nodes) => {
      nodes.forEach(n => _scan(n));
      // Also re-scan ancestors because Gmail often mutates parent containers
      nodes.forEach(n => {
        const parent = n.parentElement;
        if (parent) _scan(parent);
      });
    });
  }

  // ── Scan ───────────────────────────────────────────────────────────────────

  function _scan(root) {
    _processChips(root);
    _processRecipientAreas(root);
    _processDetailPanel(root);
  }

  // ── Email chips ───────────────────────────────────────────────────────────

  function _processChips(root) {
    CHIP_SEL.forEach(sel => {
      _queryAll(root, sel).forEach(el => _addChipButton(el));
    });
  }

  function _addChipButton(chip) {
    if (chip.hasAttribute(PROCESSED)) return;

    // data-hovercard-id can be "email:foo@bar.com" in some Gmail versions
    const hovercard = chip.getAttribute('data-hovercard-id') || '';
    const email = chip.getAttribute('email')
      || (hovercard.includes('@') ? hovercard.replace(/^[^:]+:/, '') : '')
      || CGA_Utils.extractEmails(chip.textContent)[0];

    if (!email || !CGA_Utils.isValidEmail(email)) return;

    // Guard: already has a sibling copy button right after
    if (chip.nextElementSibling?.hasAttribute('data-cga-btn')) return;

    chip.setAttribute(PROCESSED, 'true');

    const name = chip.getAttribute('name') || '';
    const btn = CGA_CopyButton.create({ email, name, hoverOnly: false });

    // Insert AFTER the chip as a sibling — never inside it.
    // Appending inside clips the button under Gmail's chip overflow styles.
    chip.insertAdjacentElement('afterend', btn);
  }

  // ── Recipient areas (To / CC / BCC) ───────────────────────────────────────

  function _processRecipientAreas(root) {
    _queryAll(root, RECIPIENT_AREA_SEL).forEach(area => {
      if (area.hasAttribute(PROCESSED)) return;
      area.setAttribute(PROCESSED, 'true');

      const emails = [];
      CHIP_SEL.forEach(sel => {
        _queryAll(area, sel).forEach(chip => {
          const hovercard = chip.getAttribute('data-hovercard-id') || '';
          const email = chip.getAttribute('email')
            || (hovercard.includes('@') ? hovercard.replace(/^[^:]+:/, '') : '')
            || CGA_Utils.extractEmails(chip.textContent)[0];
          if (email) emails.push(email);
        });
      });

      _processChips(area);

      if (emails.length > 1 && !area.querySelector('.cga-copy-all-btn')) {
        const copyAll = CGA_CopyButton.createCopyAll({ emails, label: 'Copy All' });
        area.appendChild(copyAll);
      }
    });
  }

  // ── Expanded detail panel ─────────────────────────────────────────────────

  function _processDetailPanel(root) {
    _queryAll(root, DETAIL_PANEL_SEL).forEach(panel => {
      if (panel.hasAttribute(PROCESSED)) return;
      panel.setAttribute(PROCESSED, 'true');

      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const emails = CGA_Utils.extractEmails(node.textContent);
        if (!emails.length) continue;
        const parent = node.parentElement;
        if (!parent || CGA_CopyButton.alreadyHasButton(parent)) continue;
        emails.forEach(email => {
          const btn = CGA_CopyButton.create({ email, hoverOnly: false });
          parent.insertAdjacentElement('afterend', btn);
        });
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _queryAll(root, sel) {
    try {
      const r = [];
      if (root.matches?.(sel)) r.push(root);
      r.push(...root.querySelectorAll(sel));
      return r;
    } catch { return []; }
  }

  async function _getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({ enableGmail: true }, resolve);
    });
  }

  return { init };
})();

CGA_Gmail.init();
CGA_Observer.start();
