# Zero-Delay Auto-Fill Pro

A privacy-first Chrome extension that fills job application forms instantly with your saved profile. Everything runs and stays on your machine: no servers, no analytics, no network requests.

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest_V3-34A853?style=flat-square&logo=googlechrome&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_(strict)-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Web Crypto](https://img.shields.io/badge/Web_Crypto-AES--GCM-6C5CE7?style=flat-square)

## Why

Applying for jobs means typing the same name, email, LinkedIn and GitHub links into dozens of forms. Most auto-fill tools send that data to cloud services or ship heavy frameworks. Zero-Delay takes the opposite approach:

| | Zero-Delay | Typical cloud auto-fill |
|---|---|---|
| Data storage | `chrome.storage.local` on your device | Remote servers |
| Network requests | None | API calls on every fill |
| UI | Vanilla TypeScript, no framework | React / Vue bundles |
| Encryption | Optional master password (AES-GCM) | Varies |

## Features

**Filling**
- One-click fill from the popup or the right-click menu (**⚡ Auto-Fill This Page**)
- Smart field recognition with 150+ prioritized regex patterns matched against `name`, `id`, `placeholder`, `aria-label`, `autocomplete` and the field's `<label>`
- Works with React, Angular and Vue forms by setting values through the native input setter and dispatching `input`, `change` and `blur` events
- Handles text inputs, dropdowns and checkboxes
- Remembers field values per website for forms the patterns don't cover

**Profiles**
- Multiple profiles (for example "Frontend", "Backend", "DevOps") with quick switching
- Full profile editor with grouped fields

**Security and data**
- Optional **master password**: data is encrypted with AES-GCM using a key derived via PBKDF2 — implemented with the browser's Web Crypto API, no libraries
- Built-in secure password generator
- Backup and restore as JSON, plus optional scheduled automatic backups (configurable interval) to your Downloads folder

**Interface**
- Compact popup with light and dark themes, glassmorphism styling and subtle animations

## How It Works

```text
Popup (popup.ts) ── or ── Context menu (background.ts)
          │  chrome.tabs.sendMessage(FILL_FORM)
          ▼
Content script (content.ts)
  1. Scan the page for form fields
  2. Match each field against field-patterns.ts
  3. Resolve the value from the active profile or saved site data
  4. Inject the value and dispatch DOM events
          │
          ▼
chrome.storage.local  ← storage.ts (optionally encrypted by crypto.ts)
```

## Project Structure

```text
src/
├── popup/            # popup.html · popup.css · popup.ts (UI controller)
├── background/       # Service worker: context menu, scheduled auto-backup
├── content/          # content.ts (fill engine) · field-patterns.ts (pattern registry)
└── shared/
    ├── storage.ts    # Profiles, settings, per-site data, backup/restore
    ├── crypto.ts     # PBKDF2 + AES-GCM encryption, password generator
    └── types/        # Typed profile and message definitions
manifest.json         # Manifest V3 configuration
```

## Installation

**Requirements:** Node.js 18+, Google Chrome

```bash
git clone https://github.com/aaas72/zero-delay-autofill-pro.git
cd zero-delay-autofill-pro
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the `dist/` folder.

For development, `npm run dev` rebuilds the extension on every change.

## Usage

1. Click the extension icon and open the settings to fill in your profile
2. Open any job application (LinkedIn, Greenhouse, Lever, Workday and standard HTML forms)
3. Click **Auto-Fill Form** — or right-click the page and choose **⚡ Auto-Fill This Page**
4. Review the filled fields before submitting

## Roadmap

- [ ] Keyboard shortcut for instant fill
- [ ] AI-assisted field matching for unusual forms
- [ ] Resume upload automation
- [ ] Firefox and Edge support
- [ ] Cover letter templates

## Author

**Abdellah Sheikh** — [abdellahsheikh.dev](https://abdellahsheikh.dev) · [LinkedIn](https://www.linkedin.com/in/abdellahsheikh)
