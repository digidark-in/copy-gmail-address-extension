/**
 * utils.js — shared helpers used across all modules
 */

const CGA_Utils = (() => {
  // Do NOT use the /g flag on a shared regex — /g maintains lastIndex state
  // across calls and causes isValidEmail to intermittently return false.
  const EMAIL_PATTERN = '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}';
  const EMAIL_REGEX = new RegExp(EMAIL_PATTERN, 'g');

  function extractEmails(text) {
    const matches = (text || '').match(new RegExp(EMAIL_PATTERN, 'g')) || [];
    return [...new Set(matches.map(e => e.toLowerCase()))];
  }

  function isValidEmail(str) {
    // Fresh regex each call — avoids /g lastIndex contamination
    return new RegExp('^' + EMAIL_PATTERN + '$').test((str || '').trim());
  }

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  function sanitizeText(text) {
    return (text || '').replace(/[​-‍﻿]/g, '').trim();
  }

  return { extractEmails, isValidEmail, debounce, isElementVisible, sanitizeText, EMAIL_REGEX };
})();
