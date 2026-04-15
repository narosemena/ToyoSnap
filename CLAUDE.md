# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working on the ToyoSnap codebase.

---

## Project Overview

**ToyoSnap** is a **Zero-Egress WorkflowCapture Engine** — a Manifest V3 browser extension for instructional designers that records web-based workflows and exports them as video, image chains, interactive HTML/CSS, or layered SVGs, alongside auto-generated design system documents.

**Zero-Egress** means no data ever leaves the local machine. This is a hard enterprise InfoSec constraint enforced at the CSP layer. Never relax `connect-src 'self'`.

- **License**: Apache 2.0 (see `LICENSE`)
- **Repository**: `narosemena/ToyoSnap`
- **Architecture doc**: `docs/ARCHITECTURE.md`

---

## Repository Structure

```
ToyoSnap/
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.ts
├── .gitignore
├── GENAI-DISCLOSURE.md           ← Corporate GenAI intake attestation
├── sbom.json                     ← CycloneDX SBOM (generated at build)
├── licenses.json                 ← OSS license inventory (generated at install)
├── src/
│   ├── manifest.ts               ← Typed MV3 manifest, consumed by vite-plugin-web-extension
│   ├── types/                    ← ALL interfaces (capture, ledger, storage, export, messages, mcp, …)
│   ├── security/                 ← idb-crypto, message-validator, dom-sanitizer, json-guard
│   ├── lib/                      ← idb.ts, session-store, contrast, design-extractor, markdown-builder, …
│   ├── storage/                  ← ephemeral-db (CRUD + crypto), blob-registry, purge
│   ├── capture/                  ← video, image-chain, rrweb, svg, cursor-tracker engines
│   ├── action-logger/            ← action-detector, spotlight, step-log-builder
│   ├── ledger/                   ← global-ledger, local-override-ledger, ledger-resolver, hooks
│   ├── background/               ← service-worker.ts
│   ├── content/                  ← content-script.ts, capture-coordinator, cursor-overlay
│   ├── popup/                    ← popup.html/tsx + components
│   ├── editor/                   ← editor.html/tsx, Zustand stores, components
│   ├── export-engine/            ← 9 export formats
│   └── styles/globals.css
├── tests/
│   ├── playwright.config.ts
│   ├── fixtures/                 ← extension-fixture.ts, test-pages/
│   ├── security/                 ← permission-scope, message-injection, xss-prevention, …
│   ├── e2e/                      ← zero-egress, accessibility, capture-*, pii-studio, …
│   └── unit/                     ← contrast, json-guard, ledger-resolver, markdown-builder, …
├── public/icons/                 ← 16/32/48/128 PNGs
└── docs/
    └── ARCHITECTURE.md
```

`dist/` is git-ignored (build output).

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Extension framework | Manifest V3, `vite-plugin-web-extension@4.5.1` | Not crxjs — incompatible with Vite 8 |
| UI | React 19 + TypeScript 5.x + Tailwind CSS v4 | `darkMode: 'media'` required |
| DOM recording | `rrweb@1.1.3` + `rrweb-player@1.1.3` | **Stable only** — v2 alpha unsuitable for enterprise |
| DOM → SVG | `dom-to-svg@0.12.2` | Bundled locally — no CDN |
| Document export | `pptxgenjs@4.0.1`, `docx@9.6.1`, `jszip@3.10.1` | All bundled locally |
| IDB wrapper | `idb@8.0.3` | Schema v1; all blob/rrweb writes encrypted via `idb-crypto.ts` |
| State (editor) | `zustand@5.0.12` + `immer@11.1.4` | Editor page only; no persistence |
| DOM sanitization | `dompurify@3.x` | Industry-standard XSS prevention; ⚠️ dual-license — escalate to legal |
| E2E testing | `@playwright/test@1.x` + `@axe-core/playwright` | Axe for accessibility assertions |
| Unit testing | `vitest@2.x` | Co-located with Vite config |
| Extension linting | `web-ext@8.x` | Catches manifest errors, validates permissions |
| SAST | `eslint-plugin-security` + `semgrep` | Corporate policy requirement |
| SBOM | `@cyclonedx/cyclonedx-npm` | Corporate SCA/SBOM policy; outputs `sbom.json` |
| License inventory | `license-checker` | Corporate OSS policy; outputs `licenses.json` |

---

## Git Workflow

### Branches

| Branch pattern | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `claude/<task-slug>` | AI-generated feature branches |
| `feature/<description>` | Human-authored features |
| `fix/<description>` | Bug fixes |

Active development branch: `claude/add-claude-documentation-r0oAV`

### Commit Messages

Concise, imperative-mood:
```
Add IDB encryption layer
Fix rrweb password masking in image-chain mode
Update CLAUDE.md with final tech stack
```

### Pushing

```bash
git push -u origin <branch-name>
```

Never force-push to `main`.

---

## Development Commands

```bash
npm install                  # install all dependencies
npm run licenses             # generate licenses.json — OSS license inventory (policy requirement)
npm run dev                  # Vite watch build → dist/
npm run build                # production build → dist/
npm run sbom                 # generate sbom.json — CycloneDX SBOM (policy requirement)
npm run typecheck            # tsc --noEmit (zero errors required)
npm run lint                 # eslint src tests (includes eslint-plugin-security)
npm run lint:sast            # semgrep OWASP scan — SAST policy requirement
npm run lint:manifest        # web-ext lint --source-dir dist/ (run after build)
npm run test:security        # Playwright security suite — MUST pass before all other tests
npm run test:unit            # Vitest unit tests
npm run test:e2e             # Playwright e2e (requires headed Chromium — see CI/CD below)
npm run test:a11y            # axe-core accessibility scan against editor.html + popup.html
npm run test                 # runs all of the above in order, gates on security first
```

**Loading the extension locally:**
1. `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `dist/` folder
5. After code changes: `npm run build`, then click the reload icon on the extension card

---

## Testing

| Suite | Runner | Command | Notes |
|---|---|---|---|
| Security | Playwright | `npm run test:security` | Runs first; blocks all other suites on failure |
| Unit | Vitest | `npm run test:unit` | Pure functions, no browser context needed |
| Accessibility | axe + Playwright | `npm run test:a11y` | Requires headed Chromium |
| E2E | Playwright | `npm run test:e2e` | Requires headed Chromium; `headless: false` always |

Extension tests **cannot run headless** — Chrome does not load extensions in headless mode. In CI, use `xvfb-run`.

---

## Security Invariants (Never Break These)

1. **Zero-Egress**: `connect-src 'self'` in the extension CSP must never be relaxed. Adding any external URL, API, CDN, or analytics service is a policy violation.
2. **No API keys**: No server-side component. No `.env` file. No secrets in the repo.
3. **Message validation**: Every `chrome.runtime.onMessage` handler in `service-worker.ts` must call `isValidSender(sender)` before processing.
4. **IDB encryption**: `blobs` store and `steps.rrwebEvents` must always write through `idb-crypto.ts`. Do not call `idb.put()` directly on these.
5. **No `innerHTML`**: `template-injector.ts` must only use `textContent`. Any `innerHTML` assignment is XSS.
6. **Password masking**: `rrweb-capture.ts` must always init with `maskInputOptions: { password: true }`. Non-negotiable.
7. **No `tabCapture` permission**: The manifest must not include `tabCapture`. `web-ext lint` and `permission-scope.spec.ts` will catch regression.

---

## Environment & Configuration

No environment variables are required or permitted. The extension is fully self-contained. There is no `.env` file. If a `.env` file appears, it is a mistake — do not commit it.

---

## CI/CD

Recommended GitHub Actions pipeline (each step gates the next):

```
1. npm run typecheck
2. npm run lint
3. npm run build
4. npm run lint:manifest
5. npm run test:security      ← failure blocks everything below
6. npm run test:unit
7. xvfb-run npm run test:e2e  ← includes accessibility
```

```yaml
- name: Install Xvfb
  run: sudo apt-get install -y xvfb
- name: Run E2E tests
  run: xvfb-run --auto-servernum npm run test:e2e
```

---

## Known Limitations

| Limitation | Details |
|---|---|
| iframe capture not supported | SSO providers rendering forms in iframes (PingFederate, ADFS) will have those frames missed. `all_frames: false` is intentional. |
| Background tab image-chain | `captureVisibleTab` requires the recorded tab to be in the foreground. |
| rrweb alpha upgrade path | Pinned to `rrweb@1.1.3` stable. Upgrade to v2 when GA. |
| Playwright headless | Extension tests require a real display. Cannot run in `headless: true`. |

---

## Corporate Policy Notes

- `policies.txt` **must be deleted** from the `main` branch — it reproduces Corporate policy text verbatim, which violates Section 5 of that document.
- `dompurify` has a dual Apache-2.0 / MPL-2.0 license — escalate to Corporate legal before shipping.
- Submit the Corporate GenAI Intake entry (see `GENAI-DISCLOSURE.md`) before migrating to Corporate source control.

---

## AI Assistant Notes

- Read files before editing them.
- Do not commit secrets, credentials, or `.env` files.
- Do not add `tabCapture` to the manifest.
- Do not use `innerHTML` in template injection.
- Security test suite must pass before any other suite.
- Update this `CLAUDE.md` whenever project structure, workflows, or conventions change materially.
