# AI PII Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, user-triggered AI scanning layer to ToyoSnap Studio that detects PII in captured steps and applies redactions or synthetic text replacements under full user control.

**Architecture:** Thin `src/ai/` module called directly from the editor page. Provider configs are plain objects (Anthropic / OpenAI / Bedrock). Findings flow into the existing PII ledger — no new storage primitives. All AI features gated by `aiEnabled: boolean` in `chrome.storage.local`, defaulting to `false`. Feature lives on branch `feature/ai-pii-scanner`.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS v4, Zustand + Immer, IndexedDB via ephemeral-db, chrome.storage.local, Web Crypto API (SubtleCrypto for AWS SigV4), Vitest + @testing-library/react

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/types/ai.ts` | Finding, ProviderConfig, SvgReplacement types + typed error classes |
| Create | `src/ai/pii-scanner.ts` | `scan()` — provider dispatch, AWS SigV4, error mapping |
| Create | `src/ai/svg-text-replacer.ts` | `applyReplacements()` — patches SVG text nodes |
| Create | `src/options/options.html` | Chrome options page entry point |
| Create | `src/options/options.tsx` | Provider config form (aiEnabled toggle + Anthropic/OpenAI/Bedrock tabs) |
| Create | `src/editor/components/ScanOverlay.tsx` | Overlay rendered above ImageViewer with highlight boxes + toolbar |
| Modify | `src/manifest.ts` | Add `options_page`, relax CSP for AI endpoints |
| Modify | `src/editor/store/editor-store.ts` | Add `scanFindings: Finding[] \| null` + `setScanFindings` |
| Modify | `src/editor/components/PIICanvas.tsx` | Add "Scan with AI" button, scan orchestration, SVG findings panel |
| Modify | `src/editor/components/StepViewer.tsx` | Mount `ScanOverlay` for image-chain steps |
| Create | `tests/unit/ai/pii-scanner.test.ts` | Scanner unit tests (all providers + errors) |
| Create | `tests/unit/ai/svg-text-replacer.test.ts` | Replacer unit tests |
| Create | `tests/unit/editor/ScanOverlay.test.tsx` | Overlay unit tests |
| Create | `tests/unit/options/options.test.tsx` | Options page save/load tests |

---

## Task 1: Manifest — options_page + CSP relaxation

> The extension CSP blocks external fetches by default. We deliberately relax it for the three AI API endpoints, gated behind the opt-in `aiEnabled` flag. This is documented in the spec as an approved deviation from the zero-egress default.

**Files:**
- Modify: `src/manifest.ts`

- [ ] **Step 1: Read the current manifest**

```
src/manifest.ts — already read above. Key lines:
  content_security_policy.extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self';"
  web_accessible_resources[0].resources: ["icons/*.png", "src/editor/editor.html", "src/welcome/welcome.html"]
```

- [ ] **Step 2: Update manifest.ts**

Replace the entire file with:

```typescript
/**
 * ToyoSnap Manifest V3 Configuration
 * Enforces Zero-Egress isolation via strict Content Security Policy.
 * NOTE: connect-src includes AI API endpoints — deliberate opt-in for the AI PII scanner feature.
 * These endpoints are only reached when the user enables AI features in the options page.
 */
export default {
  manifest_version: 3,
  name: "ToyoSnap",
  version: "0.1.0",
  description: "Zero-Egress WorkflowCapture Engine  -  browser extension for instructional designers",
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  permissions: ["storage", "activeTab", "scripting", "tabs"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "src/popup/popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  options_page: "src/options/options.html",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content-script.ts"],
    },
  ],
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src 'self' https://api.anthropic.com https://api.openai.com https://*.amazonaws.com;",
  },
  web_accessible_resources: [
    {
      resources: ["icons/*.png", "src/editor/editor.html", "src/welcome/welcome.html"],
      matches: ["<all_urls>"],
    },
  ],
};
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/manifest.ts
git commit -m "feat(ai): add options_page to manifest and relax CSP for AI API endpoints"
```

---

## Task 2: Types — `src/types/ai.ts`

**Files:**
- Create: `src/types/ai.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/ai.ts

export type PIIType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'face'
  | 'card'
  | 'credential'
  | 'id'
  | 'medical';

export interface Finding {
  id: string;
  piiType: PIIType;
  /** Fractional bounding box 0–1 — same format as LedgerEntry.region */
  region: { x: number; y: number; w: number; h: number };
  label: string;
  confidence: number;
  suggestedReplacement: string;
  /** Toggled by user in overlay. Pre-false when confidence < 0.5. */
  approved: boolean;
  /** CSS selector for the SVG text node — only present when scanning SVG input */
  selector?: string;
  /** Original text content — only present when scanning SVG input */
  currentText?: string;
}

export interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'bedrock';
  /** Anthropic / OpenAI */
  apiKey?: string;
  model?: string;
  /** Bedrock */
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  modelArn?: string;
}

export interface SvgReplacement {
  selector: string;
  currentText: string;
  syntheticReplacement: string;
  piiType: PIIType;
  approved: boolean;
}

export class NoProviderConfiguredError extends Error {
  constructor() {
    super('No AI provider configured. Open extension options to add credentials.');
    this.name = 'NoProviderConfiguredError';
  }
}

export class AuthError extends Error {
  constructor(message = 'Authentication failed. Check your API key in extension options.') {
    super(message);
    this.name = 'AuthError';
  }
}

export class QuotaError extends Error {
  constructor() {
    super('API quota exceeded. Try again later.');
    this.name = 'QuotaError';
  }
}

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/ai.ts
git commit -m "feat(ai): add AI types — Finding, ProviderConfig, SvgReplacement, typed errors"
```

---

## Task 3: pii-scanner — tests (TDD first)

**Files:**
- Create: `tests/unit/ai/pii-scanner.test.ts`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p tests/unit/ai
```

- [ ] **Step 2: Write the failing tests**

```typescript
// tests/unit/ai/pii-scanner.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProviderConfig } from '../../../src/types/ai';
import {
  AuthError,
  QuotaError,
  ScanError,
  NoProviderConfiguredError,
} from '../../../src/types/ai';

// Import after mocking globals
let scan: typeof import('../../../src/ai/pii-scanner').scan;

const RAW_FINDINGS = [
  {
    piiType: 'email',
    region: { x: 0.1, y: 0.2, w: 0.3, h: 0.04 },
    label: 'Email address',
    confidence: 0.97,
    suggestedReplacement: 'user@example.com',
  },
];

const LOW_CONFIDENCE_RAW = [{ ...RAW_FINDINGS[0], confidence: 0.4 }];

const ANTHROPIC_CFG: ProviderConfig = { type: 'anthropic', apiKey: 'sk-test', model: 'claude-sonnet-4-6' };
const OPENAI_CFG: ProviderConfig = { type: 'openai', apiKey: 'sk-test', model: 'gpt-4o' };
const BEDROCK_CFG: ProviderConfig = {
  type: 'bedrock',
  accessKeyId: 'AKIATEST123',
  secretAccessKey: 'testsecret456',
  region: 'us-east-1',
  modelArn: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
};

const TEST_IMAGE = new ArrayBuffer(100);

function mockOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function mockFail(status: number) {
  return { ok: false, status, json: async () => ({}) } as Response;
}

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn());
  // Import fresh each test to avoid module caching issues
  const mod = await import('../../../src/ai/pii-scanner');
  scan = mod.scan;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('scan() — Anthropic provider', () => {
  test('returns Finding[] with id and approved fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(RAW_FINDINGS) }] })
    );
    const findings = await scan(TEST_IMAGE, ANTHROPIC_CFG);
    expect(findings).toHaveLength(1);
    expect(findings[0].piiType).toBe('email');
    expect(findings[0].confidence).toBe(0.97);
    expect(findings[0].approved).toBe(true);
    expect(typeof findings[0].id).toBe('string');
    expect(findings[0].id.length).toBeGreaterThan(0);
  });

  test('pre-rejects findings with confidence < 0.5', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(LOW_CONFIDENCE_RAW) }] })
    );
    const findings = await scan(TEST_IMAGE, ANTHROPIC_CFG);
    expect(findings[0].approved).toBe(false);
  });

  test('calls api.anthropic.com', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: '[]' }] })
    );
    await scan(TEST_IMAGE, ANTHROPIC_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('api.anthropic.com');
  });

  test('throws NoProviderConfiguredError when apiKey missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'anthropic' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — OpenAI provider', () => {
  test('returns Finding[] from choices[0].message.content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ choices: [{ message: { content: JSON.stringify(RAW_FINDINGS) } }] })
    );
    const findings = await scan(TEST_IMAGE, OPENAI_CFG);
    expect(findings).toHaveLength(1);
    expect(findings[0].piiType).toBe('email');
  });

  test('calls api.openai.com', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ choices: [{ message: { content: '[]' } }] })
    );
    await scan(TEST_IMAGE, OPENAI_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('api.openai.com');
  });

  test('throws NoProviderConfiguredError when apiKey missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'openai' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — Bedrock provider', () => {
  test('sends AWS4-HMAC-SHA256 Authorization header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(RAW_FINDINGS) }] })
    );
    await scan(TEST_IMAGE, BEDROCK_CFG);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toMatch(/^AWS4-HMAC-SHA256 Credential=/);
  });

  test('calls bedrock-runtime endpoint in configured region', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: '[]' }] })
    );
    await scan(TEST_IMAGE, BEDROCK_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('bedrock-runtime.us-east-1.amazonaws.com');
  });

  test('throws NoProviderConfiguredError when credentials missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'bedrock' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — HTTP error mapping', () => {
  test('401 → AuthError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(401));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(AuthError);
  });

  test('403 → AuthError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(403));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(AuthError);
  });

  test('429 → QuotaError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(429));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(QuotaError);
  });

  test('500 → ScanError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(500));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(ScanError);
  });

  test('network failure → ScanError', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(ScanError);
  });
});
```

- [ ] **Step 3: Run tests — confirm all fail**

```bash
npm run test:unit -- tests/unit/ai/pii-scanner.test.ts
```

Expected: All tests FAIL with "Cannot find module '../../../src/ai/pii-scanner'".

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/unit/ai/pii-scanner.test.ts
git commit -m "test(ai): add failing pii-scanner tests for all providers and error cases"
```

---

## Task 4: pii-scanner — implementation

**Files:**
- Create: `src/ai/pii-scanner.ts`

- [ ] **Step 1: Create the AI module directory and scaffold**

```bash
mkdir -p src/ai
```

- [ ] **Step 2: Write the shared helpers (base64, parseFindings, mapHttpError)**

Create `src/ai/pii-scanner.ts`:

```typescript
// src/ai/pii-scanner.ts
import type { Finding, ProviderConfig } from '@/types/ai';
import {
  NoProviderConfiguredError,
  AuthError,
  QuotaError,
  ScanError,
} from '@/types/ai';

// ─── Shared helpers ────────────────────────────────────────────────────────

const IMAGE_SYSTEM_PROMPT = `You are a PII detection assistant. Analyze the image and identify all personally identifiable information. Return ONLY a JSON array where each element has:
- piiType: one of 'name'|'email'|'phone'|'address'|'face'|'card'|'credential'|'id'|'medical'
- region: {x,y,w,h} as fractions 0-1 of image dimensions
- label: human-readable description e.g. "Email address"
- confidence: 0-1
- suggestedReplacement: realistic synthetic value e.g. "user@example.com" for email, "Jane Doe" for name
Return an empty array [] if no PII is found. No other text.`;

const SVG_SYSTEM_PROMPT = `You are a PII detection assistant. Analyze the SVG source and identify all personally identifiable information in text nodes. Return ONLY a JSON array where each element has:
- piiType: one of 'name'|'email'|'phone'|'address'|'face'|'card'|'credential'|'id'|'medical'
- selector: CSS selector that uniquely identifies the SVG text element (e.g. "#email-label", "text.user-name")
- currentText: the exact text content of the element
- label: human-readable description e.g. "Email address"
- confidence: 0-1
- suggestedReplacement: realistic synthetic value e.g. "user@example.com" for email, "Jane Doe" for name
- region: {x:0,y:0,w:0,h:0}
Return an empty array [] if no PII is found. No other text.`;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function parseFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => {
    const confidence = Number(item['confidence'] ?? 0);
    const finding: Finding = {
      id: crypto.randomUUID(),
      piiType: item['piiType'] as Finding['piiType'],
      region: (item['region'] as Finding['region']) ?? { x: 0, y: 0, w: 0, h: 0 },
      label: String(item['label'] ?? ''),
      confidence,
      suggestedReplacement: String(item['suggestedReplacement'] ?? ''),
      approved: confidence >= 0.5,
    };
    if (item['selector']) finding.selector = String(item['selector']);
    if (item['currentText']) finding.currentText = String(item['currentText']);
    return finding;
  });
}

function mapHttpError(status: number): never {
  if (status === 401 || status === 403) throw new AuthError();
  if (status === 429) throw new QuotaError();
  throw new ScanError(`API returned status ${status}`);
}

// ─── Anthropic ────────────────────────────────────────────────────────────

async function callAnthropic(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.apiKey) throw new NoProviderConfiguredError();

  const isSvg = typeof input === 'string';
  const content = isSvg
    ? [{ type: 'text', text: input }]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: toBase64(input) } }];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model ?? 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  return parseFindings(JSON.parse(text));
}

// ─── OpenAI ────────────────────────────────────────────────────────────────

async function callOpenAI(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.apiKey) throw new NoProviderConfiguredError();

  const isSvg = typeof input === 'string';
  const userContent = isSvg
    ? [{ type: 'text', text: input }]
    : [
        { type: 'text', text: 'Identify all PII in this image.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${toBase64(input)}` } },
      ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? 'gpt-4o',
      messages: [
        { role: 'system', content: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? '[]';
  return parseFindings(JSON.parse(text));
}

// ─── AWS Bedrock (Signature V4) ───────────────────────────────────────────

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

async function callBedrock(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.modelArn) {
    throw new NoProviderConfiguredError();
  }

  const now = new Date();
  const amzDate =
    now.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '') + '';
  // Format: 20240101T120000Z
  const isoString = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateStamp = isoString.slice(0, 8);

  const isSvg = typeof input === 'string';
  const content = isSvg
    ? [{ type: 'text', text: input }]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: toBase64(input) } }];

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const host = `bedrock-runtime.${config.region}.amazonaws.com`;
  const path = `/model/${encodeURIComponent(config.modelArn)}/invoke`;
  const service = 'bedrock';
  const payloadHash = await sha256Hex(requestBody);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${isoString}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${isoString}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      host,
      'x-amz-date': isoString,
      Authorization: authorization,
    },
    body: requestBody,
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  return parseFindings(JSON.parse(text));
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function scan(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal?: AbortSignal,
): Promise<Finding[]> {
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 15_000);

  // Combine caller signal + timeout without AbortSignal.any (compat)
  const combined = new AbortController();
  timeout.signal.addEventListener('abort', () => combined.abort(), { once: true });
  if (signal) signal.addEventListener('abort', () => combined.abort(), { once: true });

  try {
    switch (config.type) {
      case 'anthropic':
        return await callAnthropic(input, config, combined.signal);
      case 'openai':
        return await callOpenAI(input, config, combined.signal);
      case 'bedrock':
        return await callBedrock(input, config, combined.signal);
    }
  } catch (err) {
    if (
      err instanceof NoProviderConfiguredError ||
      err instanceof AuthError ||
      err instanceof QuotaError ||
      err instanceof ScanError
    ) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ScanError('Scan timed out after 15 seconds');
    }
    throw new ScanError(err instanceof Error ? err.message : 'Unknown scan error');
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 3: Run the tests — confirm they pass**

```bash
npm run test:unit -- tests/unit/ai/pii-scanner.test.ts
```

Expected: All tests PASS.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/ai/pii-scanner.ts
git commit -m "feat(ai): implement pii-scanner with Anthropic, OpenAI, and Bedrock providers"
```

---

## Task 5: svg-text-replacer — TDD

**Files:**
- Create: `src/ai/svg-text-replacer.ts`
- Create: `tests/unit/ai/svg-text-replacer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/ai/svg-text-replacer.test.ts
import { describe, test, expect } from 'vitest';
import { applyReplacements } from '../../../src/ai/svg-text-replacer';
import type { SvgReplacement } from '../../../src/types/ai';

const FIXTURE_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <text id="email-field" x="100" y="100">john.smith@acme.com</text>
  <text id="name-field" x="100" y="150">John Smith</text>
  <text id="static" x="100" y="200">No PII here</text>
</svg>`;

const REPLACEMENTS: SvgReplacement[] = [
  {
    selector: '#email-field',
    currentText: 'john.smith@acme.com',
    syntheticReplacement: 'user@example.com',
    piiType: 'email',
    approved: true,
  },
  {
    selector: '#name-field',
    currentText: 'John Smith',
    syntheticReplacement: 'Jane Doe',
    piiType: 'name',
    approved: true,
  },
];

describe('applyReplacements()', () => {
  test('replaces text in approved nodes', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).toContain('user@example.com');
    expect(result).toContain('Jane Doe');
  });

  test('removes original PII text', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).not.toContain('john.smith@acme.com');
    expect(result).not.toContain('John Smith');
  });

  test('skips unapproved replacements', () => {
    const result = applyReplacements(FIXTURE_SVG, [{ ...REPLACEMENTS[0], approved: false }]);
    expect(result).toContain('john.smith@acme.com');
  });

  test('leaves unmatched selectors unchanged', () => {
    const result = applyReplacements(FIXTURE_SVG, [
      { selector: '#nonexistent', currentText: 'x', syntheticReplacement: 'y', piiType: 'name', approved: true },
    ]);
    expect(result).toContain('No PII here');
  });

  test('leaves non-PII text nodes untouched', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).toContain('No PII here');
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm run test:unit -- tests/unit/ai/svg-text-replacer.test.ts
```

Expected: FAIL — "Cannot find module '../../../src/ai/svg-text-replacer'".

- [ ] **Step 3: Implement applyReplacements**

```typescript
// src/ai/svg-text-replacer.ts
import type { SvgReplacement } from '@/types/ai';

export function applyReplacements(svgText: string, replacements: SvgReplacement[]): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  for (const r of replacements) {
    if (!r.approved) continue;
    const el = doc.querySelector(r.selector);
    if (el) el.textContent = r.syntheticReplacement;
  }

  return new XMLSerializer().serializeToString(doc);
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm run test:unit -- tests/unit/ai/svg-text-replacer.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/svg-text-replacer.ts tests/unit/ai/svg-text-replacer.test.ts
git commit -m "feat(ai): implement svg-text-replacer with TDD"
```

---

## Task 6: Options page

**Files:**
- Create: `src/options/options.html`
- Create: `src/options/options.tsx`
- Create: `tests/unit/options/options.test.tsx`

- [ ] **Step 1: Create the HTML entry point**

```html
<!-- src/options/options.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ToyoSnap Options</title>
    <link rel="stylesheet" href="../styles/globals.css" />
  </head>
  <body class="bg-white text-gray-900 min-h-screen">
    <div id="root"></div>
    <script type="module" src="./options.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the failing options test**

```bash
mkdir -p tests/unit/options
```

```typescript
// tests/unit/options/options.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string[], cb: (r: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const k of keys) result[k] = mockStorage[k];
        cb(result);
      }),
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        Object.assign(mockStorage, data);
        cb?.();
      }),
    },
  },
});

import { Options } from '../../../src/options/options';

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  vi.mocked(chrome.storage.local.get).mockClear();
  vi.mocked(chrome.storage.local.set).mockClear();
});

describe('Options page', () => {
  test('renders AI toggle defaulting to off', () => {
    render(<Options />);
    const toggle = screen.getByRole('checkbox', { name: /enable ai features/i });
    expect(toggle).not.toBeChecked();
  });

  test('provider fields hidden when AI disabled', () => {
    render(<Options />);
    expect(screen.queryByLabelText(/api key/i)).toBeNull();
  });

  test('provider fields appear when AI enabled', async () => {
    render(<Options />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable ai features/i }));
    await waitFor(() => expect(screen.getByLabelText(/api key/i)).toBeInTheDocument());
  });

  test('Save persists aiEnabled and providerConfig to chrome.storage.local', async () => {
    render(<Options />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable ai features/i }));
    await waitFor(() => screen.getByLabelText(/api key/i));
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'sk-test-key' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ aiEnabled: true }),
        expect.any(Function),
      )
    );
  });

  test('loads saved config from chrome.storage.local on mount', async () => {
    mockStorage['aiEnabled'] = true;
    mockStorage['aiProvider'] = 'anthropic';
    mockStorage['aiProviderConfig'] = { type: 'anthropic', apiKey: 'sk-saved' };
    render(<Options />);
    await waitFor(() => {
      const toggle = screen.getByRole('checkbox', { name: /enable ai features/i });
      expect(toggle).toBeChecked();
    });
    expect(screen.getByDisplayValue('sk-saved')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
npm run test:unit -- tests/unit/options/options.test.tsx
```

Expected: FAIL — "Cannot find module '../../../src/options/options'".

- [ ] **Step 4: Implement Options component**

```typescript
// src/options/options.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { scan } from '@/ai/pii-scanner';
import type { ProviderConfig } from '@/types/ai';

type Provider = 'anthropic' | 'openai' | 'bedrock';

export function Options() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [modelArn, setModelArn] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      ['aiEnabled', 'aiProvider', 'aiProviderConfig'],
      (result) => {
        if (result['aiEnabled']) setAiEnabled(true);
        if (result['aiProvider']) setProvider(result['aiProvider'] as Provider);
        const cfg = result['aiProviderConfig'] as ProviderConfig | undefined;
        if (cfg) {
          if (cfg.apiKey) setApiKey(cfg.apiKey);
          if (cfg.model) setModel(cfg.model);
          if (cfg.accessKeyId) setAccessKeyId(cfg.accessKeyId);
          if (cfg.secretAccessKey) setSecretAccessKey(cfg.secretAccessKey);
          if (cfg.region) setRegion(cfg.region);
          if (cfg.modelArn) setModelArn(cfg.modelArn);
        }
      },
    );
  }, []);

  function buildConfig(): ProviderConfig {
    if (provider === 'bedrock') {
      return { type: 'bedrock', accessKeyId, secretAccessKey, region, modelArn };
    }
    return { type: provider, apiKey, model: model || undefined };
  }

  function handleSave() {
    chrome.storage.local.set(
      { aiEnabled, aiProvider: provider, aiProviderConfig: buildConfig() },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    );
  }

  async function handleTest() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const probe = new ArrayBuffer(0);
      await scan(probe, buildConfig());
      setTestStatus('ok');
      setTestMessage('Connection successful');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  return (
    <div className="max-w-lg mx-auto p-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ToyoSnap Options</h1>

      {/* AI toggle */}
      <div className="flex items-center gap-3">
        <input
          id="ai-toggle"
          type="checkbox"
          checked={aiEnabled}
          onChange={(e) => setAiEnabled(e.target.checked)}
          className="w-4 h-4"
          aria-label="Enable AI features"
        />
        <label htmlFor="ai-toggle" className="text-sm font-medium text-gray-700">
          Enable AI features
        </label>
      </div>

      {aiEnabled && (
        <div className="space-y-4 border border-gray-200 rounded-xl p-4">
          {/* Provider selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Provider
            </label>
            <div className="flex gap-2">
              {(['anthropic', 'openai', 'bedrock'] as Provider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                    provider === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {p === 'bedrock' ? 'AWS Bedrock' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Credential fields */}
          {provider !== 'bedrock' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="API Key"
                />
              </div>
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model (optional)
                </label>
                <input
                  id="model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { id: 'access-key-id', label: 'Access Key ID', value: accessKeyId, setter: setAccessKeyId, placeholder: 'AKIA...' },
                { id: 'secret-access-key', label: 'Secret Access Key', value: secretAccessKey, setter: setSecretAccessKey, placeholder: '••••••••' },
                { id: 'region', label: 'Region', value: region, setter: setRegion, placeholder: 'us-east-1' },
                { id: 'model-arn', label: 'Model ARN', value: modelArn, setter: setModelArn, placeholder: 'anthropic.claude-3-5-sonnet-...' },
              ].map(({ id, label, value, setter, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    id={id}
                    type={id === 'secret-access-key' ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
            </button>
            {testMessage && (
              <span className={testStatus === 'ok' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                {testMessage}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        aria-label="Save"
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Options />);
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npm run test:unit -- tests/unit/options/options.test.tsx
```

Expected: All PASS.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/options/options.html src/options/options.tsx tests/unit/options/options.test.tsx
git commit -m "feat(ai): add options page with provider config and aiEnabled toggle"
```

---

## Task 7: Editor store — add scanFindings

**Files:**
- Modify: `src/editor/store/editor-store.ts`

- [ ] **Step 1: Read the current editor store**

Open `src/editor/store/editor-store.ts` and locate the store interface.

- [ ] **Step 2: Add scanFindings to the store**

Add these lines to the store interface and implementation. Find the existing `interface EditorStore` block and add:

```typescript
// In the interface — add after existing fields:
scanFindings: import('@/types/ai').Finding[] | null;
setScanFindings: (findings: import('@/types/ai').Finding[] | null) => void;
```

And in the `create()` implementation add:

```typescript
scanFindings: null,
setScanFindings: (findings) =>
  set((state) => {
    state.scanFindings = findings;
  }),
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/editor/store/editor-store.ts
git commit -m "feat(ai): add scanFindings to editor store"
```

---

## Task 8: ScanOverlay — TDD

**Files:**
- Create: `src/editor/components/ScanOverlay.tsx`
- Create: `tests/unit/editor/ScanOverlay.test.tsx`

- [ ] **Step 1: Write the failing tests**

```bash
mkdir -p tests/unit/editor
```

```typescript
// tests/unit/editor/ScanOverlay.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ScanOverlay } from '../../../src/editor/components/ScanOverlay';
import type { Finding } from '../../../src/types/ai';

const F1: Finding = {
  id: 'f1',
  piiType: 'email',
  region: { x: 0.1, y: 0.2, w: 0.3, h: 0.04 },
  label: 'Email address',
  confidence: 0.97,
  suggestedReplacement: 'user@example.com',
  approved: true,
};

const F2: Finding = {
  id: 'f2',
  piiType: 'name',
  region: { x: 0.1, y: 0.4, w: 0.2, h: 0.04 },
  label: 'Full name',
  confidence: 0.3,
  suggestedReplacement: 'Jane Doe',
  approved: false,
};

describe('ScanOverlay', () => {
  test('renders label + confidence for each finding', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Email address · 97%')).toBeInTheDocument();
    expect(screen.getByText('Full name · 30%')).toBeInTheDocument();
  });

  test('Apply button is disabled when zero findings are approved', () => {
    render(
      <ScanOverlay findings={[{ ...F1, approved: false }, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('Apply button shows count of approved findings', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    // F1 approved, F2 not → "Apply 1 finding"
    expect(screen.getByRole('button', { name: /apply 1 finding/i })).toBeInTheDocument();
  });

  test('Accept All approves all findings and enables Apply', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));
    expect(screen.getByRole('button', { name: /apply 2 findings/i })).not.toBeDisabled();
  });

  test('Clear All rejects all findings and disables Apply', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('clicking Apply calls onApply with approved findings and active tool', () => {
    const onApply = vi.fn();
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={onApply} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'f1' })]),
      'blur',
    );
    expect(onApply.mock.calls[0][0]).toHaveLength(1);
  });

  test('when no active tool, shows tool picker modal on Apply click', () => {
    render(<ScanOverlay findings={[F1]} activeTool={null} onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    expect(screen.getByText(/choose redaction type/i)).toBeInTheDocument();
  });

  test('tool picker calls onApply with selected tool', () => {
    const onApply = vi.fn();
    render(<ScanOverlay findings={[F1]} activeTool={null} onApply={onApply} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    fireEvent.click(screen.getByRole('button', { name: /^redact$/i }));
    expect(onApply).toHaveBeenCalledWith(expect.any(Array), 'redact');
  });

  test('reject toggle decreases approved count', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    // Initially 1 approved (F1). Click reject on F1.
    fireEvent.click(screen.getByTestId('reject-f1'));
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm run test:unit -- tests/unit/editor/ScanOverlay.test.tsx
```

Expected: All FAIL — "Cannot find module".

- [ ] **Step 3: Implement ScanOverlay**

```typescript
// src/editor/components/ScanOverlay.tsx
import React, { useState } from 'react';
import type { Finding } from '@/types/ai';
import type { PIIOperationType } from '@/types/ledger';

interface Props {
  findings: Finding[];
  activeTool: PIIOperationType | null;
  onApply: (approved: Finding[], tool: PIIOperationType) => void;
  onDismiss: () => void;
}

const PII_COLORS: Record<Finding['piiType'], string> = {
  name: '#f59e0b',
  email: '#ef4444',
  phone: '#8b5cf6',
  address: '#06b6d4',
  face: '#ec4899',
  card: '#f97316',
  credential: '#dc2626',
  id: '#0891b2',
  medical: '#16a34a',
};

export function ScanOverlay({ findings, activeTool, onApply, onDismiss }: Props) {
  const [local, setLocal] = useState<Finding[]>(() => findings.map((f) => ({ ...f })));
  const [showPicker, setShowPicker] = useState(false);
  const approved = local.filter((f) => f.approved);

  function toggle(id: string) {
    setLocal((prev) => prev.map((f) => (f.id === id ? { ...f, approved: !f.approved } : f)));
  }

  function acceptAll() {
    setLocal((prev) => prev.map((f) => ({ ...f, approved: true })));
  }

  function clearAll() {
    setLocal((prev) => prev.map((f) => ({ ...f, approved: false })));
  }

  function doApply(tool: PIIOperationType) {
    setShowPicker(false);
    onApply(approved, tool);
  }

  function handleApplyClick() {
    if (!activeTool) {
      setShowPicker(true);
    } else {
      doApply(activeTool);
    }
  }

  const applyLabel =
    approved.length === 0
      ? 'Apply'
      : `Apply ${approved.length} finding${approved.length !== 1 ? 's' : ''}`;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {local.map((f) => {
        const color = PII_COLORS[f.piiType];
        return (
          <div
            key={f.id}
            className="absolute pointer-events-auto group"
            style={{
              left: `${f.region.x * 100}%`,
              top: `${f.region.y * 100}%`,
              width: `${f.region.w * 100}%`,
              height: `${f.region.h * 100}%`,
              border: `2px solid ${color}`,
              background: `${color}26`,
              opacity: f.approved ? 1 : 0.3,
            }}
          >
            <div
              className="absolute flex items-center gap-1 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ background: color, top: '-22px', left: 0 }}
            >
              {f.label} · {Math.round(f.confidence * 100)}%
              <button
                type="button"
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => f.approved || toggle(f.id)}
                aria-label={`approve ${f.label}`}
              >
                ✓
              </button>
              <button
                type="button"
                data-testid={`reject-${f.id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggle(f.id)}
                aria-label={`reject ${f.label}`}
              >
                ✗
              </button>
            </div>
          </div>
        );
      })}

      {/* Toolbar */}
      <div
        className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-3 pointer-events-auto"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={approved.length === 0}
            onClick={handleApplyClick}
            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applyLabel}
          </button>
        </div>
      </div>

      {/* Tool picker */}
      {showPicker && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto">
          <div className="bg-white rounded-xl p-4 shadow-xl space-y-2 w-44">
            <p className="text-sm font-semibold text-gray-800">Choose redaction type</p>
            {(['blur', 'redact', 'pixelate'] as PIIOperationType[]).map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => doApply(tool)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm capitalize hover:bg-gray-100"
              >
                {tool}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm run test:unit -- tests/unit/editor/ScanOverlay.test.tsx
```

Expected: All PASS.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/editor/components/ScanOverlay.tsx tests/unit/editor/ScanOverlay.test.tsx
git commit -m "feat(ai): implement ScanOverlay component with TDD"
```

---

## Task 9: PIICanvas — Scan with AI button + scan orchestration

**Files:**
- Modify: `src/editor/components/PIICanvas.tsx`

> Read the current PIICanvas.tsx before editing. This task adds: (1) `aiEnabled` state from chrome.storage.local, (2) "Scan with AI" button visible only when aiEnabled, (3) scan() call with loading/cancel/error states, (4) setScanFindings() to push results to editor store, (5) SVG findings panel for SVG steps.

- [ ] **Step 1: Read current PIICanvas.tsx**

```
File: src/editor/components/PIICanvas.tsx
Read the full file before making any changes.
```

- [ ] **Step 2: Add imports at the top of PIICanvas.tsx**

After the existing imports, add:

```typescript
import { scan } from '@/ai/pii-scanner';
import { applyReplacements } from '@/ai/svg-text-replacer';
import type { Finding, SvgReplacement } from '@/types/ai';
import type { ProviderConfig } from '@/types/ai';
import { NoProviderConfiguredError, AuthError, QuotaError, ScanError } from '@/types/ai';
import { useEditorStore } from '@/editor/store/editor-store';
import { getBlob, updateBlob } from '@/storage/ephemeral-db';
```

- [ ] **Step 3: Add AI state inside PIICanvas component body**

After the existing `useState` calls, add:

```typescript
const setScanFindings = useEditorStore((s) => s.setScanFindings);
const [aiEnabled, setAiEnabled] = React.useState(false);
const [scanState, setScanState] = React.useState<'idle' | 'scanning' | 'error'>('idle');
const [scanError, setScanError] = React.useState('');
const [cancelController, setCancelController] = React.useState<AbortController | null>(null);
// SVG replacement state
const [svgReplacements, setSvgReplacements] = React.useState<SvgReplacement[]>([]);

React.useEffect(() => {
  chrome.storage.local.get(['aiEnabled'], (result) => {
    setAiEnabled(result['aiEnabled'] === true);
  });
}, []);
```

- [ ] **Step 4: Add handleScan function inside PIICanvas**

After the state declarations, add:

```typescript
async function handleScan() {
  if (!step) return;
  setScanState('scanning');
  setScanError('');
  setScanFindings(null);
  setSvgReplacements([]);

  const controller = new AbortController();
  setCancelController(controller);

  try {
    const config = await new Promise<ProviderConfig>((resolve, reject) => {
      chrome.storage.local.get(['aiProvider', 'aiProviderConfig'], (result) => {
        const cfg = result['aiProviderConfig'] as ProviderConfig | undefined;
        if (!cfg) reject(new NoProviderConfiguredError());
        else resolve(cfg);
      });
    });

    const isSvg = step.mimeType === 'image/svg+xml';

    if (isSvg && step.blobId) {
      const buffer = await getBlob(step.blobId);
      if (!buffer) throw new ScanError('Could not load SVG blob');
      const svgText = new TextDecoder().decode(buffer);
      const findings = await scan(svgText, config, controller.signal);
      // For SVG scans the AI returns selector + currentText on each Finding
      const replacements: SvgReplacement[] = findings
        .filter((f) => f.selector && f.currentText)
        .map((f) => ({
          selector: f.selector!,
          currentText: f.currentText!,
          syntheticReplacement: f.suggestedReplacement,
          piiType: f.piiType,
          approved: f.approved,
        }));
      setSvgReplacements(replacements);
    } else if (step.blobId) {
      const buffer = await getBlob(step.blobId);
      if (!buffer) throw new ScanError('Could not load image blob');
      const findings = await scan(buffer, config, controller.signal);
      setScanFindings(findings);
    }

    setScanState('idle');
  } catch (err) {
    setScanState('error');
    if (err instanceof NoProviderConfiguredError) {
      setScanError('Configure an AI provider in extension options');
    } else if (err instanceof AuthError) {
      setScanError('API key invalid — check extension options');
    } else if (err instanceof QuotaError) {
      setScanError('API quota exceeded — try again later');
    } else if (err instanceof ScanError) {
      setScanError(err.message);
    } else {
      setScanError('Scan failed');
    }
  } finally {
    setCancelController(null);
  }
}

async function handleApplySvgReplacements() {
  if (!step?.blobId) return;
  const approved = svgReplacements.filter((r) => r.approved);
  if (approved.length === 0) return;
  const buffer = await getBlob(step.blobId);
  if (!buffer) return;
  const svgText = new TextDecoder().decode(buffer);
  const patched = applyReplacements(svgText, approved);
  const patchedBuffer = new TextEncoder().encode(patched).buffer;
  await updateBlob(step.blobId, patchedBuffer);
  setSvgReplacements([]);
}
```

- [ ] **Step 5: Add "Scan with AI" button to the PIICanvas JSX**

Find the return statement in PIICanvas. At the top of the rendered output (before the tool toggle buttons), add the scan button section:

```tsx
{aiEnabled && (
  <div className="mb-3">
    {scanState === 'scanning' ? (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs text-gray-500">Scanning…</span>
        {cancelController && (
          <button
            type="button"
            onClick={() => cancelController.abort()}
            className="text-xs text-red-500 hover:underline ml-auto"
          >
            Cancel
          </button>
        )}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => void handleScan()}
        className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Scan with AI
      </button>
    )}
    {scanState === 'error' && (
      <p className="mt-1 text-xs text-red-600">{scanError}</p>
    )}
  </div>
)}
```

- [ ] **Step 6: Add SVG findings panel to PIICanvas JSX**

Below the tool toggles section, add:

```tsx
{svgReplacements.length > 0 && (
  <div className="mt-4 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        AI Findings
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setSvgReplacements((r) => r.map((x) => ({ ...x, approved: true })))}
          className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-50"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={() => setSvgReplacements((r) => r.map((x) => ({ ...x, approved: false })))}
          className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-50"
        >
          Clear All
        </button>
      </div>
    </div>
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {svgReplacements.map((r, i) => (
        <div key={i} className={['flex items-center gap-1 text-xs rounded p-1', r.approved ? '' : 'opacity-40'].join(' ')}>
          <span className="font-semibold capitalize text-[10px] w-14 shrink-0 text-gray-500">{r.piiType}</span>
          <span className="truncate text-gray-700 flex-1">{r.currentText}</span>
          <span className="text-gray-400 shrink-0">→</span>
          <input
            type="text"
            value={r.syntheticReplacement}
            onChange={(e) =>
              setSvgReplacements((prev) =>
                prev.map((x, j) => (j === i ? { ...x, syntheticReplacement: e.target.value } : x))
              )
            }
            className="border border-gray-200 rounded px-1 py-0.5 text-xs w-24 shrink-0"
          />
          <button type="button" onClick={() => setSvgReplacements((p) => p.map((x, j) => j === i ? { ...x, approved: !x.approved } : x))}
            className="text-[11px] w-4 shrink-0 text-center">
            {r.approved ? '✓' : '✗'}
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      disabled={!svgReplacements.some((r) => r.approved)}
      onClick={() => {
        if (window.confirm('Apply synthetic replacements to SVG? This cannot be undone.')) {
          void handleApplySvgReplacements();
        }
      }}
      className="w-full py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Apply replacements
    </button>
  </div>
)}
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors. Fix any type errors by checking import paths and function signatures.

- [ ] **Step 8: Commit**

```bash
git add src/editor/components/PIICanvas.tsx
git commit -m "feat(ai): add Scan with AI button and SVG findings panel to PIICanvas"
```

---

## Task 10: StepViewer — mount ScanOverlay

**Files:**
- Modify: `src/editor/components/StepViewer.tsx`

> Read the current StepViewer.tsx before editing. The ScanOverlay must be absolutely positioned inside the ImageViewer container so it overlays the image perfectly.

- [ ] **Step 1: Read StepViewer.tsx**

```
File: src/editor/components/StepViewer.tsx
Read the full file. Locate the ImageViewer rendering section.
```

- [ ] **Step 2: Add imports**

At the top of StepViewer.tsx, add:

```typescript
import { ScanOverlay } from './ScanOverlay';
import { useEditorStore } from '@/editor/store/editor-store';
import { usePIIStore } from '@/editor/store/pii-store';
import type { LedgerEntry } from '@/types/ledger';
```

(Skip any of these that are already imported.)

- [ ] **Step 3: Add scanFindings + handler inside StepViewer**

Inside the StepViewer component body, add:

```typescript
const scanFindings = useEditorStore((s) => s.scanFindings);
const setScanFindings = useEditorStore((s) => s.setScanFindings);
const activeTool = useEditorStore((s) => s.activeTool);
const { applyOperation } = usePIIStore();
const activeSessionId = useEditorStore((s) => s.activeSessionId);
const activeStepIndex = useEditorStore((s) => s.activeStepIndex);

async function handleApplyFindings(
  approved: import('@/types/ai').Finding[],
  tool: import('@/types/ledger').PIIOperationType,
) {
  if (!activeSessionId || activeStepIndex === null) return;
  const stepId = String(activeStepIndex);
  for (const f of approved) {
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      operationType: tool,
      rrwebId: null,
      elementSelector: '',
      region: f.region,
      blurRadius: tool === 'blur' ? 8 : null,
      pixelCellSize: tool === 'pixelate' ? 8 : null,
      redactColor: tool === 'redact' ? '#000000' : null,
      applyGlobally: false,
      replacementText: '[REDACTED]',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await applyOperation(entry, 'local', activeSessionId, stepId);
  }
  setScanFindings(null);
}
```

- [ ] **Step 4: Wrap the ImageViewer in a relative container and mount ScanOverlay**

Find the JSX section that renders `<ImageViewer ... />` (or the image display element). Wrap it in a `position: relative` container and add ScanOverlay as a sibling:

```tsx
{/* Image-chain viewer with optional ScanOverlay */}
<div className="relative w-full h-full">
  <ImageViewer /* existing props */ />
  {scanFindings && scanFindings.length > 0 && (
    <ScanOverlay
      findings={scanFindings}
      activeTool={activeTool}
      onApply={(approved, tool) => void handleApplyFindings(approved, tool)}
      onDismiss={() => setScanFindings(null)}
    />
  )}
</div>
```

Locate the exact JSX by searching for where `mimeType === 'image/png'` or the `ImageViewer` component is rendered. Wrap only that section.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Build the extension**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/editor/components/StepViewer.tsx
git commit -m "feat(ai): mount ScanOverlay in StepViewer for image-chain steps"
```

---

## Task 11: Final validation

- [ ] **Step 1: Run full unit test suite**

```bash
npm run test:unit
```

Expected: All tests pass (including the 4 new test files).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Build the extension**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Manual smoke test**

1. Run `npm run build`
2. Load extension in Chrome (`chrome://extensions` → Load unpacked → `dist/`)
3. Right-click extension icon → Options → confirm AI toggle shows, confirm provider fields appear when enabled
4. Open the editor via any captured session
5. With AI disabled: confirm "Scan with AI" button is absent from PIICanvas
6. Enable AI in options, configure a provider, return to editor
7. With AI enabled: confirm "Scan with AI" button appears in PIICanvas
8. Click "Scan with AI" on an image-chain step → confirm spinner → confirm overlay appears with findings
9. Approve/reject findings → click Apply → confirm redaction is applied and overlay dismisses

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(ai): complete AI PII scanner — options page, scan overlay, SVG replacer"
```
