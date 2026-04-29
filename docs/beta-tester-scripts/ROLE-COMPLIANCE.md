# Tester Script — Compliance / InfoSec Reviewer

This script verifies ToyoSnap's core security invariants: Zero-Egress (no data leaves the machine), AES-GCM encryption at rest, permission scope, password masking, and session-key ephemerality.

You need: Chrome DevTools access (no special tools required beyond the browser).

**Before starting:** Complete [PREREQUISITES.md](PREREQUISITES.md). Keep DevTools → Network tab open with "Preserve log" checked for the duration of the session.

**Estimated time:** ~30 minutes.

**Feedback table:** Copy the blank table from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md) and fill it in as you go.

---

## Section A — Record one session (baseline)

Record the full 7-step Acme workflow in **DOM Replay** mode. Follow [SHARED-WORKFLOW.md](SHARED-WORKFLOW.md) exactly. Then open the editor via "Open Vault & Editor".

| # | Step | Expected result |
|---|---|---|
| A-1 | Complete the 7-step workflow with DOM Replay mode recording active | Session appears in editor sidebar after stopping |
| A-2 | While recording, glance at the DevTools Network tab | No requests should be visible to any external domain. Only `chrome-extension://…` internal messaging and the demo page's own origin (`narosemena.github.io` or `file://`) |

---

## Section H — Security invariant verification

### H-1 — Zero-Egress: network audit

| # | Step | Expected result |
|---|---|---|
| H-1a | After the full recording-and-editor session, review the DevTools Network log | Filter by "XHR" and "Fetch". Zero outbound requests to any external origin. The only entries allowed are requests to the demo page's own origin |
| H-1b | Open the editor page (`chrome-extension://…/src/editor/editor.html`) and reproduce the network filter | Again: no external requests. Fetches of `blob:` and `data:` URIs are acceptable (these are local) |
| H-1c | Attempt an export (any format, e.g., **Action Log**) | The download is initiated via a `blob:` URL. DevTools shows no network request to any external server |

**Severity if failed:** Blocker — Zero-Egress violation.

---

### H-2 — CSP: confirm `connect-src 'self'` is enforced

| # | Step | Expected result |
|---|---|---|
| H-2a | In Chrome, open `chrome://extensions`, find ToyoSnap, click **Details**, then click "Inspect views: service worker" | The service worker DevTools console opens |
| H-2b | In the console, run: `chrome.runtime.getManifest().content_security_policy` | Returns an object. The `extension_pages` value must equal exactly: `"script-src 'self'; object-src 'self'; connect-src 'self';"` |
| H-2c | Confirm the returned string contains no external URLs, wildcards (`*`), `unsafe-inline`, or `unsafe-eval` | String matches the expected value precisely |

**Severity if failed:** Blocker.

---

### H-3 — Permission scope audit

| # | Step | Expected result |
|---|---|---|
| H-3a | In the service worker console (from H-2a), run: `chrome.runtime.getManifest().permissions` | Returns an array |
| H-3b | Confirm the array contains exactly these four values (order may vary): `"storage"`, `"activeTab"`, `"scripting"`, `"tabs"` | No additional permissions |
| H-3c | Confirm `"tabCapture"` is **absent** from the array | `tabCapture` must not be present |
| H-3d | Run: `chrome.runtime.getManifest().host_permissions` | Returns `["<all_urls>"]`. This is required for cross-site recording and is expected |

**Severity if failed:** Blocker (unexpected permission = scope creep).

---

### H-4 — Password field masking

| # | Step | Expected result |
|---|---|---|
| H-4a | Navigate to any HTTPS page that has a `<input type="password">` field. A public example: `https://en.wikipedia.org/w/index.php?title=Special:UserLogin` | The login page loads |
| H-4b | Open the popup, keep mode as "DOM Replay", click **Start Recording** | REC badge appears |
| H-4c | Click the password field and type any fake string, e.g., `s3cr3tP@ss` | Text appears masked (dots) as expected in the browser |
| H-4d | Click **Stop Recording**, then **Open Vault & Editor** | Editor opens |
| H-4e | In the editor, click the step that corresponds to typing in the password field | The step viewer shows the captured state of the page |
| H-4f | In the step viewer, confirm the password field's displayed value is **not** `s3cr3tP@ss` | The field should appear empty, masked with placeholder dots, or show `••••••••`. The real value must never appear |

**Severity if failed:** Blocker — password exfiltration in rrweb capture.

---

### H-5 — IDB encryption at rest

| # | Step | Expected result |
|---|---|---|
| H-5a | Open `chrome://indexeddb-internals` in a new tab | The IDB internals page loads |
| H-5b | Find the database named `toyosnap` (it may be under `chrome-extension://…`) | Database is listed |
| H-5c | Navigate into the `blobs` object store and inspect one record's value | The raw stored value is binary/hex — not recognizable as plain text (no JSON structure, no Acme form field values visible) |
| H-5d | Confirm the value is at least 13 bytes long (12-byte IV + ciphertext) and looks like random bytes | The layout described in the architecture doc (`[IV (12 bytes) | ciphertext]`) should be evident from the byte count |

**Note:** Chrome's IDB internals view may display the value as a byte array, ArrayBuffer, or hex string depending on the Chrome version. In any case, it should not show readable JSON or form-field strings.

**Severity if failed:** Major — PII is stored unencrypted.

---

### H-6 — Session key ephemerality

| # | Step | Expected result |
|---|---|---|
| H-6a | Confirm you have at least one captured session visible in the editor | — |
| H-6b | Close all Chrome windows completely (not just the editor tab — all of Chrome) | — |
| H-6c | Reopen Chrome and navigate to `chrome-extension://…/src/editor/editor.html` (you can find the URL in the History or bookmarks from before) | Editor loads |
| H-6d | Observe the session list | Sessions captured before the browser restart are either gone or cannot be decrypted (the UI may show them but fail to load step content). Either outcome is correct: the per-session AES-GCM key lived only in `chrome.storage.session` (in-memory), which is cleared on browser exit |

**Severity if failed:** Major — session key persists across browser restarts, weakening the "memory-only" security model.

---

### H-7 — Sensitive data export warning

| # | Step | Expected result |
|---|---|---|
| H-7a | In the editor, click the **Export** tab | Export grid appears |
| H-7b | Click any export format (e.g., **Action Log**) | A modal dialog appears: "Sensitive data warning" |
| H-7c | Attempt to click the **Export** button inside the dialog **without** checking the checkbox | The Export button remains disabled; nothing downloads |
| H-7d | Check the "I understand — don't show again for this session" checkbox | Export button becomes active |
| H-7e | Click **Export** | File downloads. Dialog closes |
| H-7f | Click a second export format | No dialog appears — suppressed for the rest of the session as promised |

**Severity if failed (H-7c):** Major — users could export without acknowledging sensitivity.

---

## Done

File your results:

1. Complete the Pass/Fail table (copy from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md)).
2. For any Blocker or Major finding, paste the console output or a screenshot into the bug report.
3. Open a **Beta Feedback** GitHub Issue and use the build string from prerequisites in the "Extension version" field.
