/**
 * copyButton.js — factory for creating animated copy buttons
 */

const CGA_CopyButton = (() => {
  const ATTR = 'data-cga-btn';

  function create({ email, name = '', hoverOnly = false, onCopy } = {}) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'true');
    btn.setAttribute('title', 'Copy');
    btn.setAttribute('aria-label', 'Copy email address');
    btn.className = 'cga-copy-btn' + (hoverOnly ? ' cga-hover-only' : '');
    btn.innerHTML = _iconSVG();
    btn.type = 'button';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const settings = await _getSettings();
      let textToCopy = email;
      if (settings.copyFormat === 'name_email' && name) {
        textToCopy = `${name} <${email}>`;
      }

      const ok = await CGA_Clipboard.copy(textToCopy);
      if (ok) {
        _showSuccess(btn);
        if (typeof onCopy === 'function') onCopy(textToCopy);
      }
    });

    return btn;
  }

  function createCopyAll({ emails = [], label = 'Copy All', onCopy } = {}) {
    const btn = document.createElement('button');
    btn.setAttribute(ATTR, 'true');
    btn.className = 'cga-copy-all-btn';
    btn.type = 'button';
    btn.innerHTML = `${_iconSVG()}<span>${label}</span>`;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const unique = [...new Set(emails.map(e => e.toLowerCase()))].sort();
      const ok = await CGA_Clipboard.copy(unique.join('\n'));
      if (ok) {
        _showSuccess(btn);
        if (typeof onCopy === 'function') onCopy(unique);
      }
    });

    return btn;
  }

  function _showSuccess(btn) {
    btn.classList.add('cga-copied');
    btn.innerHTML = _checkSVG();
    btn.setAttribute('title', 'Copied!');

    // Ripple lives inside a wrapper that clips it, so we don't need
    // overflow:hidden on the button itself (which would break the tooltip).
    const wrap = document.createElement('span');
    wrap.className = 'cga-ripple-wrap';
    const ripple = document.createElement('span');
    ripple.className = 'cga-ripple';
    wrap.appendChild(ripple);
    btn.appendChild(wrap);

    setTimeout(() => {
      btn.classList.remove('cga-copied');
      btn.innerHTML = _iconSVG();
      btn.setAttribute('title', 'Copy');
    }, 1800);
  }

  function alreadyHasButton(parent) {
    return parent?.querySelector?.(`[${ATTR}]`) !== null;
  }

  async function _getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({ copyFormat: 'email_only' }, resolve);
    });
  }

  function _iconSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  }

  function _checkSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }

  return { create, createCopyAll, alreadyHasButton };
})();
