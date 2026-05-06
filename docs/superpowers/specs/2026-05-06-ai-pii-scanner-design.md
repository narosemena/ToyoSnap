# AI PII Scanner — Design Spec

**Goal:** Add an opt-in, user-triggered AI scanning layer to ToyoSnap Studio that detects PII in captured steps and applies redactions or synthetic text replacements under full user control.

**Architecture:** Thin AI module (`src/ai/`) called directly from the editor page. Provider configs are plain objects (no class hierarchy). Findings flow into the existing PII ledger — no new storage primitives needed. All AI features gated by a master `aiEnabled` flag defaulting to `false`.

**Tech Stack:** React 19, TypeScript 5, Zustand, IndexedDB (ephemeral-db), `chrome.storage.local`, Anthropic API / OpenAI API / AWS Bedrock Runtime (AWS Signature V4)

**Branch:** `feature/ai-pii-scanner`

---

## 1. Feature Flag & Options Page

### Master toggle
- `aiEnabled: boolean` stored in `chrome.storage.local`, default `false`
- When `false`: "Scan with AI" button is **hidden entirely** in PIICanvas — no disabled state, no hint the feature exists
- When `true`: button is visible and provider config is required before a scan can run

### Options page (`src/options/options.html` + `src/options/options.tsx`)
Registered as `"options_page"` in `manifest.json`. Two states:

**AI disabled (default):**
- Single toggle: "Enable AI features" (off)
- No credential fields visible

**AI enabled:**
- Toggle on
- Provider selector: `Anthropic | OpenAI | Bedrock`
- **Anthropic tab:** API Key field
- **OpenAI tab:** API Key field
- **Bedrock tab:** Access Key ID, Secret Access Key, Region, Model ARN
- **"Test connection"** button — sends a minimal probe request, shows success/error inline
- Save button — persists provider config to `chrome.storage.local`

All credentials stored in `chrome.storage.local` (encrypted at rest by Chrome).

---

## 2. AI Module

### `src/ai/pii-scanner.ts`

```ts
export interface Finding {
  id: string;
  piiType: 'name' | 'email' | 'phone' | 'address' | 'face' | 'card' | 'credential' | 'id' | 'medical';
  region: { x: number; y: number; w: number; h: number }; // fractional 0–1
  label: string;           // e.g. "Email address"
  confidence: number;      // 0–1
  suggestedReplacement: string; // type-consistent fake: "user@example.com", "Jane Doe", etc.
  approved: boolean;       // toggled by user in overlay; starts true, confidence < 0.5 starts false
}

export interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'bedrock';
  // anthropic / openai
  apiKey?: string;
  model?: string;
  // bedrock
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  modelArn?: string;
}

export async function scan(
  input: ArrayBuffer | string,  // ArrayBuffer = image, string = SVG text
  config: ProviderConfig,
  signal?: AbortSignal,
): Promise<Finding[]>
```

**Provider dispatch** — `switch (config.type)`:
- `'anthropic'` → `POST api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`, vision content block (base64 image) or text block (SVG)
- `'openai'` → `POST api.openai.com/v1/chat/completions`, model `gpt-4o`, `image_url` content block or text
- `'bedrock'` → `POST bedrock-runtime.{region}.amazonaws.com/model/{modelArn}/invoke`, AWS Signature V4 signed

All providers receive an identical system prompt instructing the model to return a JSON array:
```json
[
  {
    "piiType": "email",
    "region": { "x": 0.12, "y": 0.34, "w": 0.25, "h": 0.04 },
    "label": "Email address",
    "confidence": 0.97,
    "suggestedReplacement": "user@example.com"
  }
]
```
Regions are fractional (0–1) relative to image dimensions — maps directly to `LedgerEntry.region`.

**Timeout:** 15 seconds. After 15s, `scan()` rejects with a `ScanError`; the caller (editor) shows a cancellation option at 15s.

**Typed errors:**
```ts
class NoProviderConfiguredError extends Error {}
class AuthError extends Error {}           // 401 / 403
class QuotaError extends Error {}          // 429
class ScanError extends Error {}           // all other failures
```

### `src/ai/svg-text-replacer.ts`

```ts
export interface SvgReplacement {
  selector: string;       // CSS selector to the SVG text node
  currentText: string;
  syntheticReplacement: string;
  piiType: Finding['piiType'];
  approved: boolean;
}

export function applyReplacements(
  svgText: string,
  replacements: SvgReplacement[],
): string  // returns patched SVG string
```

Parses the SVG string with `DOMParser`, queries each selector, replaces `textContent`. Returns serialized SVG. Called only after user clicks "Apply replacements" — never called automatically.

---

## 3. Overlay UI — Image-chain Steps

### `src/editor/ScanOverlay.tsx`

Absolutely positioned `<div>` layered above `ImageViewer`, matching its dimensions exactly. Mounted by `StepViewer` when the active step is `image-chain` and `aiEnabled` is true.

**Rendering:**
- One highlight box per `Finding`, color-coded by `piiType`
- Each box: pill label `"Email · 94%"` + ✓ / ✗ toggle buttons (visible on hover)
- Findings with `confidence < 0.5` render pre-rejected (30% opacity, ✗ pre-checked)
- Rejected findings stay visible at 30% — user can re-approve

**Toolbar (bottom of overlay):**
```
[Accept All]  [Clear All]  ────────────  [Apply N findings ▾]
```
- **Accept All** — marks all findings `approved: true`
- **Clear All** — marks all findings `approved: false`
- **Apply N findings** — disabled until ≥ 1 finding is approved
  - If no active tool in PIICanvas: shows a picker modal (blur / redact / pixelate) before writing
  - On confirm: calls `pii-store.applyOperation()` for each approved finding using `finding.region` as `LedgerEntry.region`
  - Overlay dismisses after apply

---

## 4. SVG Findings Panel

Rendered inside the existing **PIICanvas right panel** (new section below the tool toggles, visible only after a scan on an SVG step).

**Layout per row:**
```
[piiType badge]  [currentText]  →  [editable syntheticReplacement]  [✓] [✗]
```
- Replacement field is editable — user can override the AI suggestion
- Findings with `confidence < 0.5` pre-rejected

**Controls:**
```
[Accept All]  [Clear All]  ────────────  [Apply replacements]
```
- **Apply replacements** — disabled until ≥ 1 finding is approved
- On confirm: calls `svg-text-replacer.applyReplacements()` with approved rows, overwrites the SVG blob in IDB
- **This operation is irreversible** — no ledger entry, the blob itself changes. A confirmation dialog warns the user before applying.

---

## 5. PIICanvas Integration

**"Scan with AI" button** added to `PIICanvas.tsx`:
- Visible only when `aiEnabled === true` (read from `chrome.storage.local` on mount)
- Shows a spinner during scan (button disabled)
- After 15s with no response: "Cancel" button appears alongside spinner
- On success: populates `ScanOverlay` (image-chain) or SVG findings panel (SVG)
- On error: inline toast with typed message:
  - `NoProviderConfiguredError` → "Configure an AI provider in extension options"
  - `AuthError` → "API key invalid — check extension options"
  - `QuotaError` → "API quota exceeded — try again later"
  - `ScanError` → "Scan failed: [message]" + Retry button

---

## 6. Manifest Changes

```json
{
  "options_page": "src/options/options.html",
  "host_permissions": [
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://*.amazonaws.com/*"
  ]
}
```

---

## 7. Data Flow Summary

### Image-chain scan
1. User clicks "Scan with AI" in PIICanvas
2. Editor reads `aiEnabled` + `providerConfig` from `chrome.storage.local`
3. Step blob fetched from IDB as `ArrayBuffer`
4. `pii-scanner.scan(buffer, config)` called
5. `Finding[]` returned → `ScanOverlay` renders highlights — **nothing written yet**
6. User approves / rejects findings (individually or via Accept All / Clear All)
7. User clicks "Apply N findings"
8. If no active tool: picker modal shown
9. `pii-store.applyOperation()` called per approved finding → ledger entry created (undo/redo supported)

### SVG scan
1. Same trigger + config resolution
2. SVG blob fetched from IDB as text string
3. `pii-scanner.scan(svgText, config)` called
4. `SvgReplacement[]` returned → PIICanvas SVG panel populates — **nothing written yet**
5. User reviews / edits synthetic replacements, approves/rejects
6. User clicks "Apply replacements"
7. Confirmation dialog shown ("This cannot be undone")
8. `svg-text-replacer.applyReplacements()` called → patched SVG string overwrites blob in IDB

---

## 8. Testing

| Test | File | What it asserts |
|---|---|---|
| `scan()` anthropic provider | `tests/unit/ai/pii-scanner.test.ts` | Mock fetch returns fixture JSON → `Finding[]` shape correct |
| `scan()` openai provider | same | Same with OpenAI response fixture |
| `scan()` bedrock provider | same | AWS Sig V4 headers present in mock fetch call |
| `scan()` error types | same | 401 → `AuthError`, 429 → `QuotaError`, network error → `ScanError` |
| `applyReplacements()` | `tests/unit/ai/svg-text-replacer.test.ts` | Fixture SVG in → text nodes replaced, untouched nodes unchanged |
| `ScanOverlay` render | `tests/unit/editor/ScanOverlay.test.tsx` | Renders findings, ✓/✗ toggles work, Apply disabled until ≥1 approved |
| `ScanOverlay` Accept All | same | All findings flip to approved, Apply enables |
| Options page save/load | `tests/unit/options/options.test.tsx` | Config persists to and loads from `chrome.storage.local` |

No live API calls in tests — all providers mocked via `vi.stubGlobal('fetch', ...)`.

---

## 9. Out of Scope (this version)

- rrweb and video capture mode scanning
- Per-finding redaction type selection (active tool applies to all)
- Batch scan across multiple steps
- Scan history / audit log
- On-device / local model fallback
