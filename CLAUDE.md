# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ToyoSnap** is a **Zero-Egress WorkflowCapture Engine** — a Manifest V3 browser extension for instructional designers that records web-based workflows and exports them as video, image chains, interactive HTML/CSS, or layered SVGs, alongside auto-generated design system documents.

**Zero-Egress** means no data ever leaves the local machine. This is a hard enterprise InfoSec constraint enforced at the CSP layer. Never relax `connect-src 'self'`.

- **License**: Apache 2.0 (see `LICENSE`)
- **Repository**: `narosemena/ToyoSnap`
- **Architecture doc**: `docs/ARCHITECTURE.md`

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

**Running a single test:**
```bash
# Vitest — single unit test file
npx vitest run tests/unit/json-guard.test.ts

# Playwright — single spec file
npx playwright test tests/security/permission-scope.spec.ts
npx playwright test tests/e2e/zero-egress.spec.ts
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

The Playwright extension fixture (`tests/fixtures/extension-fixture.ts`) launches Chromium with the built extension loaded and exposes the `extensionId` extracted from the service worker URL.

---

## Architecture

### Service Worker — Hub & State Machine

`src/background/service-worker.ts` is the routing hub. It manages `SessionControlPlane` (recording state stored in `chrome.storage.session`, ~200 bytes), handles `START_CAPTURE` / `STOP_CAPTURE` / `TRIGGER_CAPTURE_VISIBLE_TAB` messages, and routes data through `ephemeral-db.ts` (which transparently encrypts before writing to IDB). Every `onMessage` handler calls `isValidSender(sender)` before processing.

### Push-Resume + Self-Resume Fallback (MV3 + SSO Survival)

MV3 service workers sleep between events. On page navigation (including SSO redirects), two idempotent resume paths run, and whichever fires first wins:

1. **Push-resume**: `chrome.tabs.onUpdated` in the SW sends `RESUME_CAPTURE` to the content script.
2. **Self-resume fallback**: The content script checks `chrome.storage.session` on `document_idle` in case the SW was sleeping and the message never arrived.

### Encryption Architecture (AES-GCM 256)

`src/security/idb-crypto.ts` generates a per-session key via `crypto.subtle.generateKey` once per browser session, stored in `chrome.storage.session` (memory-only, cleared on browser exit). All blob and rrweb event writes are encrypted before storage; reads are decrypted transparently. Layout: `[IV (12 bytes) | ciphertext]`.

`src/storage/ephemeral-db.ts` is the only correct entry point for IDB writes — it wraps all sensitive writes with encryption. No module should call `idb.put()` directly on blobs or rrweb events.

rrweb events are JSON-stringified, encrypted, and stored in the `blobs` store under a derived key (`rrweb-{sessionId}-{stepIndex}`). The step record stores `rrwebEvents: null` to keep the schema clean.

### IDB Schema (v1, database `toyosnap`)

| Store | Key | Notes |
|---|---|---|
| `sessions` | `sessionId` | Session metadata |
| `steps` | `[sessionId, stepIndex]` | Step records; `rrwebEvents` field is always `null` here |
| `blobs` | `blobId` | Encrypted `ArrayBuffer` (screenshots, rrweb payloads) |
| `globalLedger` | `id` | User-wide PII blur/redact rules |
| `localLedger` | `[sessionId, stepId, rrwebId]` | Per-session PII overrides |
| `designSystems` | `sessionId` | Auto-extracted colors, typography, shadows, anti-patterns |
| `actionLogs` | `sessionId` | Step-by-step action log |

### Step Flush Timing

rrweb continuously emits events. ToyoSnap defers the flush to IDB by one task tick (`setTimeout(flush, 0)`) so that rrweb's own click listener fires first, ensuring the triggering click is included in the current step rather than the next.

### Vite Build Quirks

`vite.config.ts` contains two custom plugins that work around Chrome extension restrictions:

1. **`chromeNoUnderscoreFiles()`**: Chrome rejects files starting with `_`. Vite emits `__vite-browser-external.js` — this plugin renames it in the output and patches all references in other chunks.

2. **`escapeNonCharacters()`**: Chrome rejects source files containing the U+FFFE non-character. rrweb's CSS parser emits it for BOM detection — this plugin escapes it to the literal string `￾` in the bundle.

### Export Engine (9 Formats)

All exports are produced locally with zero external requests. The HTML Replay format bundles rrweb-player JS and CSS using Vite's `?raw` import suffix, inlining them directly into the self-contained output file.

| Format | Library |
|---|---|
| Video (WebM) | `MediaRecorder` |
| PNG Chain (ZIP) | `jszip` + `captureVisibleTab` |
| SVG Chain (ZIP) | `dom-to-svg` (4 named layers) |
| HTML Replay | `rrweb-player` (JS+CSS inlined via `?raw`) |
| Action Log | Plain text |
| Markdown | `MASTER.md` + `pages/` ZIP |
| PPTX | `pptxgenjs` |
| DOCX | `docx` |
| MCP JSON | MCPLog schema v1.0 |

### Ledger System (PII Operations)

Two-level ledger in `src/ledger/`:
- **Global ledger**: User-wide rules (e.g., "blur SSN across all captures")
- **Local ledger**: Per-session, per-element rules

`LedgerEntry` tracks `operationType` (`"blur"` | `"redact"`), the `rrwebId` DOM node ID, `elementSelector`, `applyGlobally`, and timestamps.

### State Layers

| Layer | Technology | Contents |
|---|---|---|
| `chrome.storage.session` | In-memory, cleared on browser exit | `SessionControlPlane` (~200 bytes) |
| IndexedDB `toyosnap` | Persists across restarts | Sessions, steps, encrypted blobs, ledger, design systems |
| Zustand + Immer (editor) | In-memory, no persistence | `EditorStore` (UI state), `PIIStore` (PII ops + undo/redo) |

---

## Key Files

| Concern | File |
|---|---|
| Typed MV3 manifest | `src/manifest.ts` |
| Message type union | `src/types/messages.ts` |
| Core data model | `src/types/capture.ts` |
| Encryption | `src/security/idb-crypto.ts` |
| Message sender validation | `src/security/message-validator.ts` |
| Prototype pollution guard | `src/security/json-guard.ts` |
| IDB CRUD + encryption wrapping | `src/storage/ephemeral-db.ts` |
| rrweb recording | `src/capture/rrweb-capture.ts` |
| Vite build plugins | `vite.config.ts` |
| Extension test fixture | `tests/fixtures/extension-fixture.ts` |
| Security invariant checklist | `tests/security/permission-scope.spec.ts` |

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

## Git Workflow

Branch naming: `main` (stable), `claude/<task-slug>` (AI), `feature/<description>` (human), `fix/<description>` (bugs). Never force-push to `main`. Commit messages: concise imperative mood (`Add IDB encryption layer`).

Update this `CLAUDE.md` whenever project structure, workflows, or conventions change materially.
