# Copy Gmail Address

A lightweight, privacy-friendly Chrome extension that adds one-click copy buttons for email addresses throughout Gmail and all Google products.

No backend. No analytics. No tracking. Everything runs locally in your browser.

---

## Features

| # | Feature |
|---|---------|
| 1 | Copy button on Google Account popup (works on all Google products) |
| 2 | Copy sender email in Gmail |
| 3 | Copy To / CC / BCC recipients |
| 4 | Copy emails from expanded message detail panels |
| 5 | "Copy All" button for recipient groups |
| 6 | Copy Name + Email format option |
| 7 | Extension popup with page email count |
| 8 | Collect all emails on current page, deduplicated & sorted |
| 9 | Email count display in popup |
| 10 | Hover-only mode for a clean UI |
| 11 | Animated copy button with success checkmark & ripple effect |
| 12 | Settings: toggle features, copy format, hover mode |

---

## Installation

### From Source (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/digidark-in/copy-gmail-address-extension.git
   cd copy-gmail-address-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the project folder

5. The extension icon appears in your toolbar — pin it for easy access

### From Chrome Web Store

*(Coming soon — pending review)*

---

## Development

### Project Structure

```
copy-gmail-address-extension/
├── manifest.json              # MV3 manifest
├── content/
│   ├── gmail.js               # Gmail-specific injection
│   ├── googleAccountPopup.js  # Google account switcher popup
│   ├── emailDetector.js       # Generic mailto: link handler
│   └── observer.js            # Central MutationObserver hub
├── modules/
│   ├── copyButton.js          # Animated copy button factory
│   ├── clipboard.js           # Clipboard API + fallback
│   ├── emailCollector.js      # Full-page email scanner
│   └── utils.js               # Shared helpers & regex
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── generate-icons.js      # Icon generator (requires: npm install canvas)
├── styles/
│   └── copyButton.css         # All button + animation styles
└── README.md
```

### Adding Support for a New Site

1. Add the URL pattern to `manifest.json` under `content_scripts > matches` and `host_permissions`.
2. Create `content/yourSite.js` and register a handler with `CGA_Observer.register(fn)`.
3. Call `YourSite.init()` at the bottom of the file — it is loaded automatically.

### Regenerating Icons

```bash
npm install canvas
node icons/generate-icons.js
```

---

## Build for Chrome Web Store

No build step required — the extension is pure JavaScript and CSS.

```bash
zip -r copy-gmail-address.zip . \
  --exclude "*.git*" \
  --exclude "node_modules/*" \
  --exclude "icons/generate-icons.js" \
  --exclude "*.zip"
```

Upload `copy-gmail-address.zip` to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

---

## GitHub Workflow

```bash
# Feature branch
git checkout -b feature/your-feature

# Make changes, commit
git add -p
git commit -m "feat: describe your change"

# Push and open PR
git push origin feature/your-feature
```

Tag releases for Web Store submissions:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Privacy

- **No analytics** — zero telemetry, no pings, no error reporting
- **No external requests** — the extension never contacts any server
- **No user accounts** — no sign-in, no cloud sync
- **Local storage only** — optional settings stored in `chrome.storage.local` on your device
- **Minimal permissions** — `clipboardWrite`, `storage`, `activeTab` only
- **Open source** — inspect every line of code yourself

---

## Chrome Web Store Publishing Checklist

- [ ] All icons present (16, 32, 48, 128 px PNG)
- [ ] `manifest.json` version bumped
- [ ] Privacy policy URL added (required for `clipboardWrite` permission justification)
- [ ] Detailed store description written
- [ ] At least 3 screenshots (1280×800 or 640×400)
- [ ] Zip created without dev files
- [ ] Permission justifications written in the submission form

---

## License

MIT © DIGIDARK CORPORATION
