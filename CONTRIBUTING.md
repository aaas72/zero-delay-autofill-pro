# Contributing to Zero-Delay Auto-Fill Pro

Thanks for your interest in improving the extension! Contributions of all sizes are welcome: new field patterns, bug fixes, tests and documentation.

## Ground rules

- **Privacy first.** The extension must never make network requests. Pull requests that add analytics, remote calls or third-party scripts will not be merged.
- **Keep it fast.** Filling should feel instant; avoid heavy DOM scans or timers.
- **Fill, never submit.** The extension only fills fields — the user always reviews and submits.

## Getting started

```bash
git clone https://github.com/aaas72/zero-delay-autofill-pro.git
cd zero-delay-autofill-pro
npm install
npm run dev        # rebuilds dist/ on every change
```

Load `dist/` via `chrome://extensions` → **Developer mode** → **Load unpacked**, and reload the extension after each rebuild.

## Where things live

| Path | What it does |
|---|---|
| `src/content/field-patterns.ts` | Regex → profile-field mapping. The easiest place to start. |
| `src/content/content.ts` | Finds fields on the page and injects values |
| `src/popup/` | Profile editor UI |
| `src/shared/` | Storage, encryption and shared types |

## Making a change

1. Look for issues labelled [`good first issue`](https://github.com/aaas72/zero-delay-autofill-pro/labels/good%20first%20issue), or open an issue describing what you'd like to change.
2. Create a branch: `git checkout -b feat/short-description`.
3. Run `npm run build` — it type-checks the project and must pass.
4. If you changed field matching, test it on at least one real application form and mention which one in the PR.
5. Open a pull request with a short description and, for UI changes, a screenshot.

## Commit messages

Use short, imperative messages, for example `Add Turkish label patterns for name fields`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
