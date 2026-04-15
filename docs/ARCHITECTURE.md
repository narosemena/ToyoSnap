# ToyoSnap — Solution Architecture Document (SAD)

## Context

ToyoSnap is a **Zero-Egress browser extension** for instructional designers. It records web-based workflows and exports them as video, image chains, interactive HTML/CSS, or layered SVGs, alongside auto-generated design system documents.

**Zero-Egress** means no data ever leaves the local machine. This is a hard enterprise InfoSec constraint enforced at the CSP layer (`connect-src 'self'`).

---

## Security Architecture

### Core Security Invariants

These must never be broken. Any PR that removes or weakens these is a security regression:

| Invariant | Location | Enforcement |
|---|---|---|
| Zero-Egress: `connect-src 'self'` in CSP | `src/manifest.ts` | `tests/security/permission-scope.spec.ts` |
| Message sender validation | `src/security/message-validator.ts` | Every SW `onMessage` handler; `tests/security/message-injection.spec.ts` |
| IDB encryption at rest (AES-GCM 256) | `src/security/idb-crypto.ts` | All blob/rrweb writes via `ephemeral-db.ts`; `tests/security/idb-encryption.spec.ts` |
| DOM injection via `textContent` only | `src/security/dom-sanitizer.ts` | `template-injector.ts`; `tests/security/xss-prevention.spec.ts` |
| Prototype pollution guard | `src/security/json-guard.ts` | `BulkImportDropzone`; `tests/security/prototype-pollution.spec.ts` |
| rrweb password masking | `src/capture/rrweb-capture.ts` | `maskInputOptions.password: true`; `tests/security/password-masking.spec.ts` |
| No `tabCapture` permission | `src/manifest.ts` | `tests/security/permission-scope.spec.ts` |
| No `assets/*` WAR | `src/manifest.ts` | `tests/security/permission-scope.spec.ts` |

### Permission Model

```
permissions: ["tabs", "activeTab", "scripting", "storage"]
host_permissions: ["<all_urls>"]
```

`tabCapture` is intentionally absent. `captureVisibleTab` requires only `activeTab` + `<all_urls>`.

### IDB Encryption

Per-session AES-GCM 256-bit key generated via `crypto.subtle.generateKey`. Key stored in `chrome.storage.session` (memory-only, cleared on browser exit). All `blobs` store values and `steps.rrwebEvents` are encrypted before write; decrypted on read. Key never touches disk.

### Message Passing

All SW ↔ content script messages use a typed discriminated union (`src/types/messages.ts`). Every `onMessage` handler calls `isValidSender(sender)` first — drops messages where `sender.id !== chrome.runtime.id`.

---

## State Management

| Layer | Technology | Contents |
|---|---|---|
| `chrome.storage.session` | In-memory, cleared on exit | `SessionControlPlane` — recording state, mode, active tab. Max ~200 bytes. |
| IndexedDB (`toyosnap`) | Persists across restarts | Capture sessions, steps (with encrypted rrweb events), encrypted blobs, ledger entries, design systems, action logs |
| Zustand | In-memory, editor page only | `EditorStore` (UI state), `PIIStore` (applied operations + undo/redo stack) |

### Initialization Order (editor page)

1. `editor-store` initializes → sets `activeSessionId` from URL param or most recent IDB session
2. `pii-store` initializes → reads ledger for `activeSessionId`
3. UI renders only after both stores are ready (`isHydrated: true`)

---

## Cross-Domain SSO Survival

### Push-Resume (Primary Path)

1. `chrome.tabs.onUpdated` fires in SW when tab navigates (status: `complete`)
2. SW checks: `isRecording === true` AND `tabId === activeTabId`
3. SW sends `RESUME_CAPTURE` to content script
4. Content script initializes fresh capture engine for the new page

### Self-Resume Fallback (SW Sleep Protection)

MV3 service workers can sleep and miss `onUpdated`. On every `document_idle`, the content script proactively checks `chrome.storage.session.get('isRecording')`. If true and no engine running: self-resume. Both paths are idempotent — whichever fires first wins.

### Tab Closure

`chrome.tabs.onRemoved` listener in SW: if the recorded tab closes while recording, SW finalizes the session (writes `endedAt`, `stepCount`) and clears the control plane. No data lost.

---

## Export Formats

| Format | File | Notes |
|---|---|---|
| Video | `video-exporter.ts` | WebM via MediaRecorder |
| PNG Chain | `png-zip-exporter.ts` | ZIP of per-click screenshots |
| SVG Chain | `svg-zip-exporter.ts` | ZIP of dom-to-svg captures with 4 named layers |
| HTML Replay | `html-replay-exporter.ts` | Self-contained rrweb-player |
| Action Log | `action-log-exporter.ts` | Plain text step log |
| Markdown | `md-exporter.ts` | MASTER.md + pages/ ZIP |
| PPTX | `pptx-exporter.ts` | pptxgenjs@4.0.1 |
| DOCX | `docx-exporter.ts` | docx@9.6.1 |
| MCP JSON | `mcp-exporter.ts` | MCPLog schema v1.0 |

All exports are produced locally. No data is transmitted. `ExportSensitivityWarning` is shown before first export per session.

---

## Known Limitations

| Limitation | Details |
|---|---|
| iframe capture not supported | SSO providers rendering forms in iframes (PingFederate, ADFS) will have those frames missed. `all_frames: false` is intentional. |
| Background tab image-chain | `captureVisibleTab` requires the recorded tab to be in the foreground. |
| rrweb alpha upgrade path | Pinned to `rrweb@1.1.3` stable. Upgrade to v2 when GA. |
| Playwright headless | Extension tests require a real display. Cannot run in `headless: true`. |

---

## Corporate Policy Compliance Status

| Requirement | Status | Artifact |
|---|---|---|
| GenAI Intake | Pending submission | `GENAI-DISCLOSURE.md` |
| Independent validation | Implemented | `tests/security/` must pass before merge |
| SAST | Implemented | `eslint-plugin-security` + `semgrep` in CI |
| SBOM | Implemented | `npm run sbom` → `sbom.json` |
| OSS license inventory | Implemented | `npm run licenses` → `licenses.json` |
| Architecture documentation | This document | `docs/ARCHITECTURE.md` |
| `policies.txt` deletion | Required | File reproduces Corporate policy verbatim — must be deleted from repo |
| `dompurify` license escalation | Required | Apache-2.0 / MPL-2.0 dual — escalate to Corporate legal before shipping |
| Corporate SCM migration | Deferred | Complete items above first |
