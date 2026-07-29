/**
 * clipboard.js — write text to clipboard using the Clipboard API with a legacy fallback
 */

const CGA_Clipboard = (() => {
  async function copy(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return _legacyCopy(text);
    }
  }

  function _legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return ok;
  }

  return { copy };
})();
