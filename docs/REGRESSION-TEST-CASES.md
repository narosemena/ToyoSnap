# ToyoSnap — Regression Test Cases

Organized by **security invariant** and **user-visible capability**. Each case names the suite it lives in, the test file path, and acceptance criteria.

---

## Section A — Security invariants (MUST PASS; blocks all other suites)

### A1. Zero-Egress Enforcement

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A1-01 | Attempting `fetch()` to an external URL from the service worker is blocked by CSP | `tests/security/zero-egress.spec.ts` | Promise rejects with CSP violation; no network request logged |
| SEC-A1-02 | Content script cannot call `fetch()` to a non-`self` origin | `tests/security/zero-egress.spec.ts` | Blocked by CSP |
| SEC-A1-03 | Editor page cannot load an external image via `<img src="https://evil.com/x.png">` | `tests/security/zero-egress.spec.ts` | `img.onerror` fires; no request |
| SEC-A1-04 | Manifest `connect-src` is `'self'` exactly — no additions | `tests/security/manifest-integrity.spec.ts` | String equality check |
| SEC-A1-05 | `web-ext lint` reports zero warnings on the built extension | `npm run lint:manifest` | Exit code 0, no warnings |

### A2. Message Validation (`isValidSender`)

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A2-01 | Message from unexpected origin is rejected | `tests/security/message-injection.spec.ts` | Handler returns `false`, no state change |
| SEC-A2-02 | Message with spoofed `sender.id` is rejected | `tests/security/message-injection.spec.ts` | Rejected |
| SEC-A2-03 | Message with missing `sender.tab` when expected is rejected | `tests/security/message-injection.spec.ts` | Rejected |
| SEC-A2-04 | **Fuzz:** 1000 randomly mutated message shapes — zero pass `isValidSender` that shouldn't | `tests/unit/message-validator.fuzz.spec.ts` | All invalid inputs rejected |
| SEC-A2-05 | Every `onMessage` handler in `service-worker.ts` calls `isValidSender` before any state mutation | `tests/security/message-validator-coverage.spec.ts` | Static AST check |

### A3. IDB Encryption

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A3-01 | Blob stored via `ephemeral-db` is encrypted at rest (ciphertext ≠ plaintext) | `tests/security/idb-encryption.spec.ts` | Binary compare |
| SEC-A3-02 | Direct `idb.put()` to `blobs` store without `idb-crypto` throws | `tests/security/idb-encryption.spec.ts` | Throws `EncryptionRequiredError` |
| SEC-A3-03 | `steps.rrwebEvents` write without encryption throws | `tests/security/idb-encryption.spec.ts` | Throws |
| SEC-A3-04 | Encryption key is session-scoped; purge on session end removes it | `tests/security/idb-encryption.spec.ts` | Key unrecoverable post-purge |
| SEC-A3-05 | Reading encrypted blob with wrong key returns no plaintext | `tests/security/idb-encryption.spec.ts` | Throws or returns null |

### A4. XSS Prevention

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A4-01 | `template-injector.ts` contains zero `innerHTML` assignments | `tests/security/xss-prevention.spec.ts` | Static grep returns 0 |
| SEC-A4-02 | Injecting `<script>alert(1)</script>` into a captured DOM sanitizes on export | `tests/security/xss-prevention.spec.ts` | Export output contains no `<script>` tags |
| SEC-A4-03 | `javascript:` URLs in captured anchors are stripped | `tests/security/xss-prevention.spec.ts` | Anchor href starts with `http` or `#` |
| SEC-A4-04 | `<iframe>` elements in captured DOM are removed | `tests/security/xss-prevention.spec.ts` | No `<iframe>` in output |
| SEC-A4-05 | SVG export strips event handlers (`onload`, `onclick`, etc.) | `tests/security/xss-prevention.spec.ts` | No `on*` attributes |
| SEC-A4-06 | **Fuzz:** 1000 mutated XSS payloads through `dom-sanitizer` — none survive | `tests/unit/dom-sanitizer.fuzz.spec.ts` | All neutralized |

### A5. Password Masking

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A5-01 | rrweb init includes `maskInputOptions: { password: true }` | `tests/security/password-masking.spec.ts` | Config inspection |
| SEC-A5-02 | Captured form with password field: exported rrweb events contain no plaintext password | `tests/e2e/password-masking.spec.ts` | Event stream search returns empty |
| SEC-A5-03 | Image-chain export of a password field shows masked characters | `tests/e2e/password-masking.spec.ts` | OCR or pixel-match on masked region |

### A6. Permission Scope

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A6-01 | Manifest does NOT include `tabCapture` | `tests/security/permission-scope.spec.ts` | JSON assertion |
| SEC-A6-02 | Manifest permissions are exactly: [defined subset only] | `tests/security/permission-scope.spec.ts` | Set equality |
| SEC-A6-03 | No `host_permissions` wildcards (`<all_urls>` forbidden unless justified) | `tests/security/permission-scope.spec.ts` | Pattern check |

### A7. JSON Guard

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| SEC-A7-01 | Parsing JSON with `__proto__` pollution is rejected | `tests/unit/json-guard.spec.ts` | Throws |
| SEC-A7-02 | Parsing deeply nested JSON (>50 levels) is rejected | `tests/unit/json-guard.spec.ts` | Throws |
| SEC-A7-03 | Parsing JSON over size limit is rejected | `tests/unit/json-guard.spec.ts` | Throws |
| SEC-A7-04 | **Fuzz:** 1000 malformed JSON inputs — zero crashes | `tests/unit/json-guard.fuzz.spec.ts` | Either valid parse or clean throw |

---

## Section B — Core capture capabilities

### B1. Video capture

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| CAP-B1-01 | Start → record 10s of a test page → stop → output is a valid WebM | `tests/e2e/capture-video.spec.ts` | File opens in ffprobe, duration ≈ 10s |
| CAP-B1-02 | Recording with rapid tab switches does not crash the extension | `tests/e2e/capture-video.spec.ts` | Extension stays loaded; capture completes |
| CAP-B1-03 | Recording over 5 minutes does not exceed IDB quota | `tests/e2e/capture-video-long.spec.ts` | No quota error; blob written |
| CAP-B1-04 | Stopping mid-capture and re-starting produces two independent sessions | `tests/e2e/capture-video.spec.ts` | Two distinct session IDs in ledger |

### B2. Image chain capture

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| CAP-B2-01 | Each captured click produces a screenshot | `tests/e2e/capture-image-chain.spec.ts` | Image count = click count |
| CAP-B2-02 | Background tab capture is rejected with a user-visible error | `tests/e2e/capture-image-chain.spec.ts` | Toast or modal shown |
| CAP-B2-03 | Screenshots are ordered chronologically in the ledger | `tests/e2e/capture-image-chain.spec.ts` | Monotonically increasing timestamps |

### B3. rrweb capture

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| CAP-B3-01 | rrweb events for a 30s session replay correctly in `rrweb-player` | `tests/e2e/capture-rrweb.spec.ts` | Replay completes without errors |
| CAP-B3-02 | iframe content is excluded from capture (`all_frames: false`) | `tests/e2e/capture-rrweb.spec.ts` | No iframe DOM in events |
| CAP-B3-03 | Dynamic DOM changes during capture are recorded | `tests/e2e/capture-rrweb.spec.ts` | Mutation events present |

### B4. SVG capture

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| CAP-B4-01 | Captured page renders as a layered SVG with visible text | `tests/e2e/capture-svg.spec.ts` | SVG opens in browser; text nodes present |
| CAP-B4-02 | External fonts are inlined or substituted (zero-egress) | `tests/e2e/capture-svg.spec.ts` | No external font refs |
| CAP-B4-03 | CSS background images resolve from the captured page, not re-fetched | `tests/e2e/capture-svg.spec.ts` | Data URIs only, no http refs |

### B5. Cursor overlay

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| CAP-B5-01 | Cursor position is recorded at capture resolution | `tests/unit/cursor-tracker.spec.ts` | Coordinates match input events |
| CAP-B5-02 | Cursor overlay in exports does not obscure captured content beyond configured opacity | `tests/e2e/cursor-overlay.spec.ts` | Pixel diff within tolerance |

---

## Section C — Export format contracts (NEW — contract tests)

Each format must produce a file that **opens and parses cleanly in its target application.** File-created ≠ file-valid.

| ID | Format | File | Acceptance |
| --- | --- | --- | --- |
| EXP-C-01 | `.pptx` | `tests/contract/export-pptx.spec.ts` | Opens in LibreOffice Impress via `soffice --headless`; slide count matches step count |
| EXP-C-02 | `.docx` | `tests/contract/export-docx.spec.ts` | Opens via pandoc; contains expected heading hierarchy |
| EXP-C-03 | `.html` (interactive) | `tests/contract/export-html.spec.ts` | Loads in Playwright; all steps clickable; no console errors |
| EXP-C-04 | `.svg` (layered) | `tests/contract/export-svg.spec.ts` | Validates against SVG 1.1 DTD; layers separable |
| EXP-C-05 | `.webm` (video) | `tests/contract/export-webm.spec.ts` | `ffprobe` reports valid codec, correct duration |
| EXP-C-06 | `.zip` (image chain) | `tests/contract/export-zip.spec.ts` | JSZip round-trip; all images valid PNG |
| EXP-C-07 | `.json` (rrweb events) | `tests/contract/export-rrweb-json.spec.ts` | Parses; replay works in fresh `rrweb-player` instance |
| EXP-C-08 | Design system doc | `tests/contract/export-design-doc.spec.ts` | Markdown renders; color tokens valid hex; contrast ratios present |
| EXP-C-09 | Storyboard | `tests/contract/export-storyboard.spec.ts` | PDF opens; page count = step count |

---

## Section D — Accessibility

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| A11Y-D-01 | `popup.html` — zero axe violations at WCAG 2.2 AA | `tests/a11y/popup.spec.ts` | Axe report empty |
| A11Y-D-02 | `editor.html` — zero axe violations at WCAG 2.2 AA | `tests/a11y/editor.spec.ts` | Axe report empty |
| A11Y-D-03 | All interactive controls keyboard-navigable (Tab/Shift+Tab/Enter/Space) | `tests/a11y/keyboard-nav.spec.ts` | Focus order correct; all actions reachable |
| A11Y-D-04 | All exports include alt text or equivalent for imagery | `tests/a11y/export-alt-text.spec.ts` | Grep for `alt=""` or missing |
| A11Y-D-05 | Contrast ratios in editor UI meet AA (4.5:1 text, 3:1 large) | `tests/a11y/contrast.spec.ts` | `contrast.ts` utility verification |

---

## Section E — Ledger & storage integrity

| ID | Case | File | Acceptance |
| --- | --- | --- | --- |
| LED-E-01 | Session purge removes all blobs and ledger entries | `tests/e2e/purge.spec.ts` | IDB count = 0 post-purge |
| LED-E-02 | Local override ledger takes precedence over global for matching keys | `tests/unit/ledger-resolver.spec.ts` | Override value returned |
| LED-E-03 | Concurrent writes to the same session do not corrupt the ledger | `tests/unit/ledger-concurrent.spec.ts` | No lost writes; schema intact |
| LED-E-04 | Extension reload mid-session does not lose committed ledger entries | `tests/e2e/session-persistence.spec.ts` | Entries recoverable |

---

## Section F — Performance (warning-only, trended)

| ID | Case | File | Budget |
| --- | --- | --- | --- |
| PERF-F-01 | Editor initial load with 10MB rrweb stream | `tests/perf/editor-load.spec.ts` | < 2.0s |
| PERF-F-02 | Export of 5-minute recording to `.pptx` | `tests/perf/export-pptx.spec.ts` | < 30s |
| PERF-F-03 | Capture start latency (click record → first frame) | `tests/perf/capture-start.spec.ts` | < 500ms |
| PERF-F-04 | Memory footprint during 10-minute capture | `tests/perf/capture-memory.spec.ts` | < 500MB peak |

---

## How to run

```
npm run test              # Everything, in strategy-defined order
npm run test:security     # Security only (fast fail)
npm run test:unit         # Units (fast)
npm run test:e2e          # E2E (slow, requires xvfb in CI)
npm run test:contract     # NEW — export format validation
npm run test:fuzz         # NEW — property-based security tests
npm run test:perf         # NEW — performance trends
```

## How new test cases get added

When a bug is reported via user testing or InfoSec review:

1. Write a **failing test** that reproduces the bug first.
2. Fix the code.
3. Confirm the test now passes.
4. Commit the test + fix together.

No fix merges without a regression test covering it. This is the single most valuable habit we can build.
