/**
 * emailCollector.js — scans the current page for all visible email addresses
 */

const CGA_EmailCollector = (() => {
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'HEAD']);

  function collectAll() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: _filter }
    );

    const found = new Set();
    let node;
    while ((node = walker.nextNode())) {
      const emails = CGA_Utils.extractEmails(node.textContent);
      emails.forEach(e => found.add(e));
    }

    // also check href="mailto:" links
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      const email = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email) found.add(email);
    });

    return [...found].sort();
  }

  function _filter(node) {
    let parent = node.parentElement;
    while (parent) {
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      parent = parent.parentElement;
    }
    return CGA_Utils.EMAIL_REGEX.test(node.textContent)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT;
  }

  return { collectAll };
})();
