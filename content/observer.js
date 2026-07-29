/**
 * observer.js — central MutationObserver hub.
 *
 * Key design: mutations are ACCUMULATED in a buffer across debounce calls.
 * The standard debounce pattern drops intermediate batches (replaces args),
 * which causes us to miss elements added in early mutation phases of a
 * multi-phase load (e.g. the Google Account popup).
 */

const CGA_Observer = (() => {
  const handlers = [];
  let observer = null;
  // Accumulated added elements across all mutation batches in the debounce window
  const _pending = [];
  let _timer = null;

  function register(fn) {
    handlers.push(fn);
  }

  function start() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      // Collect every added element from every batch — never drop any
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) _pending.push(node);
        }
      }

      // Debounce the dispatch so rapid consecutive mutations are batched
      clearTimeout(_timer);
      _timer = setTimeout(_flush, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  function _flush() {
    if (_pending.length === 0) return;
    // Drain the buffer
    const batch = _pending.splice(0);
    handlers.forEach(fn => {
      try { fn(batch); } catch (e) { /* isolate per-handler errors */ }
    });
  }

  // Expose for modules that need an immediate dispatch (e.g. after a click)
  function flushNow() {
    clearTimeout(_timer);
    _flush();
  }

  return { register, start, flushNow };
})();
