/**
 * emailDetector.js — generic email detector that adds copy buttons to any
 * raw email text nodes and mailto: links found in the page (non-Gmail specifics).
 */

const CGA_EmailDetector = (() => {
  const PROCESSED = 'data-cga-detected';

  async function init() {
    const settings = await _getSettings();
    if (!settings.enableAutoDetect) return;

    _scanMailtoLinks(document.body);
    CGA_Observer.register((nodes) => {
      nodes.forEach(n => _scanMailtoLinks(n));
    });
  }

  function _scanMailtoLinks(root) {
    const links = root.matches?.('a[href^="mailto:"]')
      ? [root]
      : [...root.querySelectorAll('a[href^="mailto:"]')];

    links.forEach(link => {
      if (link.hasAttribute(PROCESSED)) return;
      link.setAttribute(PROCESSED, 'true');

      const email = link.href.replace('mailto:', '').split('?')[0].trim();
      if (!email) return;

      const wrapper = document.createElement('span');
      wrapper.className = 'cga-inline-wrap';
      link.parentNode.insertBefore(wrapper, link);
      wrapper.appendChild(link);

      const btn = CGA_CopyButton.create({ email, hoverOnly: true });
      wrapper.appendChild(btn);
    });
  }

  async function _getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get({ enableAutoDetect: true }, resolve);
    });
  }

  return { init };
})();

CGA_EmailDetector.init();
