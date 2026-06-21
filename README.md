# ⚡ Zero-Delay Auto-Fill

### Lightning-fast, Privacy-First Job Application Auto-Filler

> A Chrome Extension (Manifest V3) that instantly fills job application forms with your pre-saved profile data. **Zero external requests. Zero latency. 100% local.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Privacy](https://img.shields.io/badge/Privacy-First-6C5CE7?style=for-the-badge&logo=shield&logoColor=white)](/)
[![License: MIT](https://img.shields.io/badge/License-MIT-00CEC9?style=for-the-badge)](LICENSE)

---

## 🎯 Why Zero-Delay?

Applying to jobs is repetitive. Filling out the same fields — name, email, LinkedIn, GitHub — across dozens of applications wastes hours. Existing auto-fill solutions rely on cloud services, send your data to external servers, or load heavy UI frameworks causing noticeable delays.

**Zero-Delay** solves this with a fundamentally different architecture:

| Feature | Zero-Delay | Others |
|---|---|---|
| **Data Storage** | 100% Local (`chrome.storage`) | Cloud servers |
| **Network Requests** | Zero | Multiple API calls |
| **UI Framework** | Vanilla TypeScript | React/Vue bundles |
| **Fill Speed** | Instant (< 5ms) | 200ms–2s |
| **Privacy** | Your data never leaves your machine | Data uploaded to third parties |

---

## ✨ Features

### 🏗️ Architecture
- **Vanilla TypeScript** — No React, no Vue, no Angular. Pure TypeScript compiled with Vite for maximum performance
- **Manifest V3** — Built on the latest Chrome Extension architecture with service workers
- **Zero Dependencies** — No runtime dependencies beyond the Chrome APIs

### 🔍 Smart Field Recognition
- **40+ Regex Patterns** — Identifies form fields by analyzing `name`, `id`, `placeholder`, `aria-label`, `autocomplete`, and adjacent `<label>` text
- **SPA Compatible** — Dispatches native DOM events (`input`, `change`, `blur`) with React's `nativeInputValueSetter` trick for full compatibility with React, Angular, and Vue applications
- **Select & Checkbox Support** — Handles dropdowns and checkboxes, not just text inputs

### 🔒 Privacy First
- **Zero External Requests** — All data is stored locally in `chrome.storage.local`
- **No Analytics** — No tracking, no telemetry, no data collection
- **Open Source** — Fully auditable codebase

### 🎨 Premium UI
- **Light & Dark Mode** — System-aware with manual toggle
- **Glassmorphism Design** — Modern frosted-glass aesthetic
- **Micro-Animations** — Smooth transitions, ripple effects, and status indicators
- **320px Popup** — Compact, non-intrusive interface

### 👤 Multi-Profile Support
- Create profiles for different roles: "Frontend Dev", "Backend Dev", "DevOps"
- Quick-switch between profiles from the popup dropdown
- Full profile editor with organized fieldsets

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5 (strict mode) |
| **Bundler** | Vite 6 |
| **Extension** | Chrome Manifest V3 |
| **Storage** | `chrome.storage.local` |
| **Styling** | Pure CSS with Custom Properties |
| **Typography** | Inter (Google Fonts) |
| **Icons** | Inline SVG |

---

## 📁 Project Structure

```
zero-delay-autofill/
├── manifest.json               # Chrome Extension manifest (V3)
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Multi-entry Vite build
├── tsconfig.json               # Strict TypeScript config
├── public/
│   └── icons/                  # Extension icons (16, 48, 128)
├── src/
│   ├── popup/
│   │   ├── popup.html          # Extension popup shell
│   │   ├── popup.css           # Full design system
│   │   └── popup.ts            # UI controller & message passing
│   ├── background/
│   │   └── background.ts       # Service worker & initialization
│   ├── content/
│   │   ├── content.ts          # Auto-fill engine & DOM injection
│   │   └── field-patterns.ts   # Regex pattern registry
│   └── shared/
│       ├── storage.ts          # chrome.storage.local controller
│       └── types/
│           ├── profile.ts      # User profile interfaces
│           └── messages.ts     # Typed message definitions
└── dist/                       # Build output
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Chrome browser

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/zero-delay-autofill.git
cd zero-delay-autofill

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Load into Chrome
#    → Open chrome://extensions
#    → Enable "Developer mode" (toggle in top right)
#    → Click "Load unpacked"
#    → Select the `dist/` folder
```

### Development Mode

```bash
# Watch mode — rebuilds on file changes
npm run dev
```

---

## 📖 Usage

1. **Click the extension icon** in the Chrome toolbar
2. **Set up your profile** — Click the ⚙ gear icon and fill in your details
3. **Navigate to a job application** (LinkedIn, Indeed, Greenhouse, Lever, etc.)
4. **Click "Auto-Fill Form"** — Watch your data fill in instantly ⚡
5. **Review & submit** — Always review before submitting

### Supported Job Boards

| Platform | Status |
|---|---|
| LinkedIn | ✅ Supported |
| Indeed | ✅ Supported |
| Glassdoor | ✅ Supported |
| Greenhouse | ✅ Supported |
| Lever | ✅ Supported |
| Workday | ✅ Supported |
| SmartRecruiters | ✅ Supported |
| iCIMS | ✅ Supported |
| BambooHR | ✅ Supported |
| Ashby | ✅ Supported |
| Any standard HTML form | ✅ Supported |

---

## 🗺️ Roadmap

- [ ] **v1.1** — Import/Export profiles as JSON
- [ ] **v1.2** — Keyboard shortcut for instant fill (`Ctrl+Shift+F`)
- [ ] **v1.3** — AI-powered field matching using LLM parsing
- [ ] **v2.0** — Resume PDF auto-upload
- [ ] **v2.1** — Firefox & Edge browser support
- [ ] **v2.2** — Cover letter template engine
- [ ] **v3.0** — Job application tracker dashboard

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    POPUP (popup.ts)                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Profile  │  │  Theme   │  │   Settings Form    │  │
│  │ Selector │  │  Toggle  │  │   (Profile CRUD)   │  │
│  └────┬─────┘  └──────────┘  └────────────────────┘  │
│       │                                               │
│       │  chrome.tabs.sendMessage                      │
│       ▼                                               │
│  ┌─────────────────────────┐                         │
│  │   "Auto-Fill" Button    │                         │
│  └────────────┬────────────┘                         │
└───────────────┼──────────────────────────────────────┘
                │
   ┌────────────▼────────────┐
   │  CONTENT SCRIPT          │
   │  (content.ts)            │
   │                          │
   │  1. Query DOM elements   │
   │  2. Match field patterns │
   │  3. Resolve profile data │
   │  4. Inject values        │
   │  5. Dispatch DOM events  │
   └────────────┬─────────────┘
                │
   ┌────────────▼────────────┐
   │  STORAGE                 │
   │  (chrome.storage.local)  │
   │                          │
   │  profiles: { ... }       │
   │  activeProfileId: "..."  │
   │  settings: { ... }       │
   └──────────────────────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ⚡ by a developer who was tired of filling out the same forms.
</p>
