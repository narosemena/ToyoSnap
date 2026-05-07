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
│   ├── unit/                     ← contrast, json-guard, ledger-resolver, markdown-builder, …
│   ├── contract/                 ← NEW — export format validation (opens in target app)
│   ├── perf/                     ← NEW — performance regression budgets (warning-only)
│   └── a11y/                     ← NEW — accessibility assertions (axe)
├── templates/                    ← NEW — user testing templates
│   ├── TESTER-BRIEF.md
│   ├── OBSERVATION-LOG.md
│   ├── FEEDBACK-FORM.md
│   └── FIX-TICKET.md
├── scripts/
│   └── generate-audit-package.sh ← NEW — InfoSec evidence package generator
├── public/icons/                 ← 16/32/48/128 PNGs
└── docs/
    ├── ARCHITECTURE.md
    ├── TEST-STRATEGY.md          ← NEW — master test plan
    ├── REGRESSION-TEST-CASES.md  ← NEW — all test cases by invariant/capability
    ├── USER-TESTING-PROTOCOL.md  ← NEW — L&D user testing rounds
    └── INFOSEC-EVIDENCE-PACKAGE.md ← NEW — enterprise audit readiness checklist
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
npm run test:contract        # Vitest — export format validation (each format opens in target app)
npm run test:fuzz            # Vitest + fast-check — property-based security tests (1000+ runs)
npm run test:perf            # Playwright — performance budgets (warning-only, trend-tracked)
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
| Contract | Vitest | `npm run test:contract` | Each export format opens and parses in its target app |
| Fuzz | Vitest + fast-check | `npm run test:fuzz` | 1000+ property-based runs on security validators |
| Performance | Playwright | `npm run test:perf` | Warning-only budget checks; trend-tracked, does not block |

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

## Testing Protocol (for AI assistants)

This project has a formal test strategy. See `docs/TEST-STRATEGY.md` for the full picture.

### When you fix a bug

1. Read the fix ticket (usually in `/issues/` or linked from the PR description).
2. Reproduce the bug locally before writing code.
3. **Write a failing regression test first.** Location:
   - Security bug → `tests/security/`
   - Validator / pure logic bug → `tests/unit/`
   - User-visible flow bug → `tests/e2e/`
   - Export format bug → `tests/contract/` (create if missing)
4. Confirm the new test fails.
5. Fix the code.
6. Confirm the new test passes AND `npm run test` is green end-to-end.
7. Commit the test + fix together in the same PR.

**Do not merge a fix without a regression test covering it.** Every bug fixed without a test is a bug that will come back.

### When you add a feature

1. Extend the corresponding test suite for the user-visible capability (Section B of `docs/REGRESSION-TEST-CASES.md`).
2. If the feature touches a security invariant, extend the security suite too.
3. If the feature adds a new export format, add a contract test in `tests/contract/`.
4. If the feature changes the UI, rerun `npm run test:a11y` and address any new violations.

### When you refactor

1. Do NOT change test behavior and production code in the same PR unless the refactor is the test itself.
2. If a test starts failing during a refactor, pause and ask the human whether the test was wrong or the refactor broke something real.
3. Never silence a test by skipping it or loosening its assertion to get a green build.

### Coverage thresholds (must not regress)

`src/security/` — 80% line coverage
`src/ledger/` — 80% line coverage
`src/storage/` — 80% line coverage
`src/lib/json-guard.ts` — 90% line coverage
`src/lib/message-validator.ts` — 90% line coverage
Everything else — 60% line coverage

Enforced via Vitest `coverage.thresholds` in `vitest.config.ts`.

### End-user testing

End-user testing is a separate track with humans. You do not run it. If a bug comes to you from user testing, it will arrive as a fix ticket using `templates/FIX-TICKET.md`. Treat that as authoritative scope; do not expand it.

### What you must never do

- Skip or `.only()` a test to ship faster
- Mock a security boundary in a way that bypasses real validation in production
- Remove a test because it is "flaky" without a documented root cause
- Use `innerHTML` (still and always)
- Add any network egress (still and always)
- Change the triage severity on a fix ticket

### What to tell the human

At the end of every task, report:
- Which tests you added, and what bug each covers
- Which tests you ran, and their results
- Any security invariants this work touched, and how you verified they held
- Any assumptions you made that the human should sanity-check

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

## Design references
- `design/flows/VectoSnap Flows.html` — happy-path UX flows (A/B/E/F)
- Per-flow JSX mocks in `design/flows/components/flow-*.jsx`
- Treat these as the source of truth for layout, copy, and primitive customization affordances

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

- `dompurify` has a dual Apache-2.0 / MPL-2.0 license — escalate to Corporate legal before shipping.
- Submit the Corporate GenAI Intake entry (see `GENAI-DISCLOSURE.md`) before migrating to Corporate source control.

---

## Git Workflow

- Read files before editing them.
- Do not commit secrets, credentials, or `.env` files.
- Do not add `tabCapture` to the manifest.
- Do not use `innerHTML` in template injection.
- Security test suite must pass before any other suite.
- Update this `CLAUDE.md` whenever project structure, workflows, or conventions change materially.
- Branch naming: `main` (stable), `claude/<task-slug>` (AI), `feature/<description>` (human), `fix/<description>` (bugs). Never force-push to `main`. Commit messages: concise imperative mood (`Add IDB encryption layer`).

---

## Gemini Edits

**Session Summary: Layout, Capture Stability, Database Optimization, and Studio Polish**

The following fixes and enhancements were implemented by the Gemini CLI agent:

### 1. UI & Layout Fixes
- **Popup Centering**: Fixed an issue where the extension popup content was left-aligned by updating the main React container in `src/popup/popup.tsx` to use `w-full` instead of a fixed `w-60` width.
- **Overlay Visibility**: Ensured the hovering recording banner (`recording-overlay.ts`) is explicitly hidden just before capturing an image using `chrome.tabs.captureVisibleTab`, and restored immediately after. This prevents the "Step X captured" pill from appearing in final PNG/JPEG exports.

### 2. Capture Timing & Logic ("Before and After" Flow)
- **1 Click = 2 Captures**: Restructured both `ImageCapture` and `SvgCapture` to immediately capture the state *before* the click takes effect, and then capture again after a forced delay.
- **Timing Adjustment**: Standardized the "after-click" delay to `2000ms` across all capture modes to guarantee UI transitions and network requests complete before snapping.
- **Initial Capture**: Added a `1000ms - 2000ms` delay on startup (depending on `document.readyState`) to ensure the first page is fully rendered, preventing "blank" step #1 captures.
- **Duplicate Prevention**: Removed redundant capture triggers from `stop()` and `captureStep()` lifecycle methods.

### 3. SVG Capture Dimensions
- **Viewport Clipping Fix**: Explicitly passed `window.innerWidth` and `window.innerHeight` to the `documentToSVG` method in `svg-capture.ts`. This ensures the resulting SVG strictly reflects the visible viewport without capturing off-screen elements or clipping the right side.

### 4. Overlay Synchronization
- **Tab Targeting**: Updated the Service Worker (`service-worker.ts`) to broadcast `SESSION_UPDATED` messages specifically to the active tab (`activeTabId`) so the in-page recording overlay receives real-time updates.
- **State Hydration**: Updated `recording-overlay.ts` to request the initial `stepCount` and `recordingStartedAt` from the Service Worker upon mounting. This ensures the counter survives cross-domain navigations and page reloads.

### 5. Studio Session Management
- **Sorting**: Modified `editor.tsx` to always list recorded sessions in the sidebar in reverse chronological order (Latest First) based on `startedAt`.
- **Renaming**: Added a `name` property to the `CaptureSession` interface (`src/types/capture.ts`). Implemented an inline-editing flow in `editor.tsx` allowing users to rename sessions via the 3-dot context menu.

### 6. IndexedDB Performance (O(N) -> O(1))
- **Schema Migration**: Bumped `DB_VERSION` to `2` in `src/lib/idb.ts`.
- **Indexing**: During the upgrade, added a `sessionId` index to both the `steps` and `localLedger` object stores. Fixed a critical `TypeError` during migration by using the provided `transaction` object.
- **Query Optimization**: Updated `getStepsBySession`, `countStepsBySession`, and `getLocalLedgerEntriesBySession` in `ephemeral-db.ts` to use `db.getAllFromIndex` and `db.countFromIndex`, completely eliminating the O(N) full-table scans that bottlenecked the Service Worker.

### 7. Background Service Worker Resilience
- **process.env Fix**: Removed an unsafe `process.env.NODE_ENV` check in `service-worker.ts` that caused synchronous `ReferenceError` crashes, replacing it with Vite's safe `import.meta.env.DEV`.
- **Context Invalidation**: Added `chrome.runtime?.id` validation checks before attempting to send messages from content scripts (`svg-capture.ts`, `image-capture.ts`, `rrweb-capture.ts`) to prevent "Extension context invalidated" errors if the extension updates or reloads mid-capture.

### 8. 30-Day Retention Policy
- **Automatic Purging**: Implemented `purgeExpiredSessions()` in `ephemeral-db.ts` to automatically delete any recorded sessions (and associated blobs/ledgers) older than 30 days. This runs on Studio initialization.
- **UI Notification**: Added a persistent notification block to the bottom of the left sidebar informing users of the retention policy.

### 9. SVG Redaction Tools Enabled
- **Tool Access**: Removed the hardcoded block in `PIICanvas.tsx` that disabled redaction tools for SVGs. 
- **Contextual UI**: Conditionally restricted the "Custom CSS selector" input and "Detected elements" list to *only* appear when the active step is `image/svg+xml`, hiding them during pixel-based (PNG/JPEG) captures where they are irrelevant.

### 10. SVG-Native Redaction & Multi-Selection
- **Inline Rendering**: Introduced a specialized `SvgViewer` component in `StepViewer.tsx` that renders captured SVGs inline instead of inside an `<img>` tag, allowing direct DOM interaction.
- **Disabled Interactivity**: Intercepted `onClickCapture` events to prevent native SVG links or buttons from triggering unintended navigation while viewing captures in the Studio.
- **Click-and-Drag Multi-Selection**: Replaced single-click selection with a drag-to-select bounding box. Any SVG element intersecting the drawn rectangle is added to a `selectedSvgSelectors` array and visually highlighted with a blue outline.
- **Inline Text Editing**: Double-clicking an SVG `<text>` or `<tspan>` node spawns an absolutely positioned HTML `<input>` over the element. Pressing Enter commits the replacement text directly to the ledger.
- **Operation Grouping**: Refactored the `PIICanvas.tsx` right sidebar to fetch local ledger entries correctly on session switch and group the history of applied redactions by Step (e.g., Global, Step 1, Step 2).

### 11. Adobe Illustrator Compatibility
- **Image Inlining**: Added a post-processing routine to `svg-capture.ts`. It detects external `<image>` tags, fetches the asset via `fetch()`, and embeds it as a base64 Data URL. 
- **Fallback**: If the fetch fails (due to CORS or timeouts), it converts the relative URL to an absolute HTTP URL. This completely resolves the "Missing linked file" error when opening ToyoSnap SVGs locally in Adobe Illustrator.
