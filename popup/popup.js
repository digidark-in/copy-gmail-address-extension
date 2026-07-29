'use strict';

const $ = id => document.getElementById(id);

const DEFAULTS = {
  enableGmail: true,
  enableAccountPopup: true,
  enableAutoDetect: true,
  clickToCopy: true,
  hoverOnly: false,
  copyFormat: 'email_only',
};

let collectedEmails = [];

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  await loadSettings();
  await scanCurrentTab();
  bindUI();
}

// ── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  $('enableGmail').checked        = settings.enableGmail;
  $('enableAccountPopup').checked = settings.enableAccountPopup;
  $('enableAutoDetect').checked   = settings.enableAutoDetect;
  $('clickToCopy').checked        = settings.clickToCopy;
  $('hoverOnly').checked          = settings.hoverOnly;
  $('copyFormat').value           = settings.copyFormat;
}

async function saveSetting(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// ── Scan page ─────────────────────────────────────────────────────────────────

async function scanCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  let results;
  try {
    [results] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof CGA_EmailCollector !== 'undefined') {
          return CGA_EmailCollector.collectAll();
        }
        // fallback inline scan
        const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const text = document.body.innerText || '';
        const found = [...new Set((text.match(regex) || []).map(e => e.toLowerCase()))].sort();
        return found;
      },
    });
  } catch {
    // scripting not available (e.g. chrome:// pages)
    updateCount(0);
    return;
  }

  collectedEmails = results?.result || [];
  updateCount(collectedEmails.length);
}

function updateCount(n) {
  $('emailCount').textContent = n;
  if (n > 0) {
    $('copyAllBtn').disabled    = false;
    $('viewEmailsBtn').disabled = false;
  }
}

// ── Email list ────────────────────────────────────────────────────────────────

function renderEmailList() {
  const list = $('emailList');
  list.innerHTML = '';

  collectedEmails.forEach((email, i) => {
    const li = document.createElement('li');
    li.style.animationDelay = `${i * 30}ms`;

    const span = document.createElement('span');
    span.textContent = email;
    span.title = email;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-single';
    copyBtn.title = 'Copy';
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(email);
      showToast();
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#188038" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      }, 1600);
    });

    li.appendChild(span);
    li.appendChild(copyBtn);
    list.appendChild(li);
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg = 'Copied!') {
  const t = $('toast');
  clearTimeout(toastTimer);
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ── UI bindings ───────────────────────────────────────────────────────────────

function bindUI() {
  // Copy All
  $('copyAllBtn').addEventListener('click', async () => {
    if (!collectedEmails.length) return;
    await navigator.clipboard.writeText(collectedEmails.join('\n'));
    const btn = $('copyAllBtn');
    btn.classList.add('success');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    showToast(`Copied ${collectedEmails.length} emails`);
    setTimeout(() => {
      btn.classList.remove('success');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy All Emails`;
    }, 2000);
  });

  // View Emails toggle
  $('viewEmailsBtn').addEventListener('click', () => {
    const section = $('emailListSection');
    if (section.hidden) {
      renderEmailList();
      section.hidden = false;
    } else {
      section.hidden = true;
    }
  });

  $('closeListBtn').addEventListener('click', () => {
    $('emailListSection').hidden = true;
  });

  // Settings toggles
  ['enableGmail', 'enableAccountPopup', 'enableAutoDetect', 'clickToCopy', 'hoverOnly'].forEach(id => {
    $(id).addEventListener('change', e => saveSetting(id, e.target.checked));
  });

  $('copyFormat').addEventListener('change', e => saveSetting('copyFormat', e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
