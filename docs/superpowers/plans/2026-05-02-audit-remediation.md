# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical/High/Medium/Error-level findings from the audit report: empty catch lint errors, service-worker type-safety bypass, coverage gaps in `src/security/`, `src/ledger/`, and `src/storage/`, and the `getStepsBySession` full-table-scan performance defect.

**Architecture:** Each task is independent — linting, coverage, and performance fixes do not touch each other's files. Coverage is raised by adding unit tests that mock `getDB` / `idb-crypto` at the module boundary (no new dev dependencies needed). The performance fix rewrites `getStepsBySession` to use `IDBKeyRange.bound` on the existing compound key.

**Tech Stack:** TypeScript 5.x, Vitest 2.x, jsdom, `@testing-library/react`, `vi.mock`, `vi.stubGlobal`, `idb` library (IndexedDB wrapper already in project).

---

## Out of scope (policy / non-code items)

These findings require human action, not code changes:

- **dompurify dual-license (High):** Escalate to Corporate legal before shipping. Already documented in `CLAUDE.md`. No code action.
- **GENAI-DISCLOSURE.md (Medium):** Submit the Corporate GenAI Intake form. No code action.
- **TypeScript 5.9.3 vs <5.6.0 (Low):** The toolchain works in practice. Monitor on next TS upgrade, no code action now.
- **Pause/Resume capture (Medium) / Onboarding Flow A (Medium):** Marked "Future plan" in design docs — backlog items, not defects.
- **`innerHTML` in plan docs (Low):** Appears in completed historical plan docs (already-merged vectosnap-design plan). The production code uses shadow DOM construction — no fix needed.

---

## File Map

| Task | Files Modified | Files Created |
|------|---------------|---------------|
| 1 | `src/editor/store/editor-store.ts`, `src/types/messages.ts`, `src/background/service-worker.ts`, `src/popup/hooks/useSession.ts` | — |
| 2 | — | `tests/unit/idb-crypto.test.ts`, `tests/unit/message-validator.test.ts` |
| 3 | — | `tests/unit/global-ledger.test.ts`, `tests/unit/local-override-ledger.test.ts`, `tests/unit/ledger-hooks.test.ts` |
| 4 | — | `tests/unit/blob-registry.test.ts`, `tests/unit/ephemeral-db.test.ts`, `tests/unit/purge.test.ts` |
| 5 | `src/storage/ephemeral-db.ts`, `src/storage/purge.ts` | — |

---

## Task 1: Fix Empty Catch Blocks and `any` Type Violations

**Files:**
- Modify: `src/editor/store/editor-store.ts` (lines 35, 39, 43 — empty `catch {}`)
- Modify: `src/types/messages.ts` (add two missing message types)
- Modify: `src/background/service-worker.ts` (line 66 — `rawMsg as any`)
- Modify: `src/popup/hooks/useSession.ts` (line 54 — `message: any`)

No new tests needed — these are type fixes and lint fixes. Verification is `npm run typecheck && npm run lint`.

- [ ] **Step 1: Fix empty catch blocks in `editor-store.ts`**

The three `loadBlur`, `loadRedact`, `loadPixelate` functions each have `catch {}` — ESLint rule `no-empty` flags these. The intent (fall back to defaults if localStorage is unavailable) is correct; the fix is to add a comment so the block is not empty.

Replace all three occurrences. Before:
```typescript
function loadBlur(): BlurSettings {
  try { const v = localStorage.getItem(LS_BLUR); if (v) return JSON.parse(v) as BlurSettings; } catch {}
  return { radius: 8 };
}
function loadRedact(): RedactSettings {
  try { const v = localStorage.getItem(LS_REDACT); if (v) return JSON.parse(v) as RedactSettings; } catch {}
  return { color: "#000000", label: "[REDACTED]" };
}
function loadPixelate(): PixelateSettings {
  try { const v = localStorage.getItem(LS_PIXELATE); if (v) return JSON.parse(v) as PixelateSettings; } catch {}
  return { cellSize: 8 };
}
```

After:
```typescript
function loadBlur(): BlurSettings {
  try { const v = localStorage.getItem(LS_BLUR); if (v) return JSON.parse(v) as BlurSettings; } catch { /* storage unavailable */ }
  return { radius: 8 };
}
function loadRedact(): RedactSettings {
  try { const v = localStorage.getItem(LS_REDACT); if (v) return JSON.parse(v) as RedactSettings; } catch { /* storage unavailable */ }
  return { color: "#000000", label: "[REDACTED]" };
}
function loadPixelate(): PixelateSettings {
  try { const v = localStorage.getItem(LS_PIXELATE); if (v) return JSON.parse(v) as PixelateSettings; } catch { /* storage unavailable */ }
  return { cellSize: 8 };
}
```

- [ ] **Step 2: Add missing message types to `src/types/messages.ts`**

`GET_SESSION_STATE` and `GET_TAB_ID` are handled in the service worker but absent from the `ExtensionMessage` union. Without them, the `as ExtensionMessage` cast in Step 3 would narrow to `never` in those switch cases.

Open `src/types/messages.ts`. The current union ends at `DESIGN_SYSTEM_SAVED`. Append two entries:

```typescript
export type ExtensionMessage =
  | { type: "START_CAPTURE"; payload: { mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  | { type: "STOP_CAPTURE" }
  | { type: "BEGIN_CAPTURE"; payload: { sessionId: string; mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  | { type: "RESUME_CAPTURE"; payload: { sessionId: string; captureMode: CaptureMode; captureCursor: boolean } }
  | { type: "END_CAPTURE" }
  | { type: "CAPTURE_STEP"; payload: { actionStep: ActionStep } }
  | { type: "TRIGGER_CAPTURE_VISIBLE_TAB"; payload: { tabId: number } }
  | { type: "GET_SESSION_STATE" }
  | { type: "GET_TAB_ID" }
  | { type: "RRWEB_BATCH"; payload: { sessionId: string; events: unknown[]; url?: string; pageTitle?: string } }
  | { type: "CAPTURE_IMAGE_STEP"; payload: { sessionId: string; url: string; pageTitle: string } }
  | { type: "STORE_BLOB_STEP"; payload: { sessionId: string; url: string; pageTitle: string; base64: string; mimeType: string } }
  | { type: "EXPORT_SESSION_DATA"; payload: { sessionId: string } }
  | { type: "DESIGN_SYSTEM_SAVED"; payload: { sessionId: string; designSystem?: import("./design-system").DesignSystem } };
```

- [ ] **Step 3: Remove `rawMsg as any` in `src/background/service-worker.ts`**

Line 66: `const msg = rawMsg as any;` — security finding (Medium). After `isValidSender` passes we know the sender is our own extension; casting to the typed union is safe and gives TypeScript full narrowing in each switch case.

Change line 66 from:
```typescript
const msg = rawMsg as any;
```
to:
```typescript
const msg = rawMsg as ExtensionMessage;
```

`ExtensionMessage` is already imported at the top of the file (`import type { ExtensionMessage } from "@/types/messages";`). With proper narrowing, the inline `as { ... }` casts in the `RRWEB_BATCH`, `CAPTURE_IMAGE_STEP`, `STORE_BLOB_STEP`, and `EXPORT_SESSION_DATA` cases can also be removed since TypeScript narrows `msg.payload` per case. Remove those four inline casts:

`RRWEB_BATCH` case — before:
```typescript
const { sessionId, events, url, pageTitle } = msg.payload as {
  sessionId: string;
  events: unknown[];
  url?: string;
  pageTitle?: string;
};
```
After:
```typescript
const { sessionId, events, url, pageTitle } = msg.payload;
```

`CAPTURE_IMAGE_STEP` case — before:
```typescript
const { sessionId, url, pageTitle } = msg.payload as {
  sessionId: string; url: string; pageTitle: string;
};
```
After:
```typescript
const { sessionId, url, pageTitle } = msg.payload;
```

`STORE_BLOB_STEP` case — before:
```typescript
const { sessionId, url, pageTitle, base64, mimeType: payloadMime } = msg.payload as {
  sessionId: string; url: string; pageTitle: string; base64: string; mimeType: string;
};
```
After:
```typescript
const { sessionId, url, pageTitle, base64, mimeType: payloadMime } = msg.payload;
```

`EXPORT_SESSION_DATA` case — before:
```typescript
const { sessionId } = msg.payload as { sessionId: string };
```
After:
```typescript
const { sessionId } = msg.payload;
```

`DESIGN_SYSTEM_SAVED` case — before:
```typescript
const { designSystem } = msg.payload as { sessionId: string; designSystem: DesignSystem };
```
After:
```typescript
const { designSystem } = msg.payload;
```

- [ ] **Step 4: Fix `message: any` in `src/popup/hooks/useSession.ts`**

Line 54: `const listener = (message: any) => {` — `any` warning. Replace with a narrow type guard:

Before (lines 54-56):
```typescript
const listener = (message: any) => {
  if (message.type === 'SESSION_UPDATED') setState(message.payload);
};
```

After:
```typescript
const listener = (message: unknown) => {
  if (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'SESSION_UPDATED'
  ) {
    setState((message as { payload: SessionState }).payload);
  }
};
```

- [ ] **Step 5: Verify typecheck and lint pass**

```bash
npm run typecheck
```
Expected: zero errors.

```bash
npm run lint
```
Expected: zero errors, no more "Unexpected empty block statement" and no `no-explicit-any` errors for the four changed locations.

- [ ] **Step 6: Run unit tests to confirm no regression**

```bash
npm run test:unit
```
Expected: 52 passed.

- [ ] **Step 7: Commit**

```bash
git add src/editor/store/editor-store.ts src/types/messages.ts src/background/service-worker.ts src/popup/hooks/useSession.ts
git commit -m "Fix empty catch blocks, remove service worker any cast, type useSession listener"
```

---

## Task 2: Security Module Unit Tests (idb-crypto + message-validator)

`src/security/` is at 21.95% coverage. `dom-sanitizer.ts` and `json-guard.ts` are already covered. The gap is `idb-crypto.ts` (AES-GCM encrypt/decrypt, key management) and `message-validator.ts` (sender validation).

**Files:**
- Create: `tests/unit/idb-crypto.test.ts`
- Create: `tests/unit/message-validator.test.ts`

- [ ] **Step 1: Write failing test for `message-validator.ts`**

Create `tests/unit/message-validator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll } from 'vitest';

// chrome.runtime.id must be set before importing the module under test
beforeAll(() => {
  vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id-abc' } });
});

import { isValidSender } from '../../src/security/message-validator';

describe('isValidSender', () => {
  it('returns true when sender.id matches chrome.runtime.id', () => {
    expect(isValidSender({ id: 'test-ext-id-abc' })).toBe(true);
  });

  it('returns false when sender.id differs', () => {
    expect(isValidSender({ id: 'malicious-extension' })).toBe(false);
  });

  it('returns false when sender has no id', () => {
    expect(isValidSender({})).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails (chrome not defined)**

```bash
npm run test:unit -- tests/unit/message-validator.test.ts
```
Expected: FAIL — `ReferenceError: chrome is not defined` (proves the test is actually exercising real code).

- [ ] **Step 3: Confirm `vi.stubGlobal` placement is correct, then run again**

The `beforeAll` stub must run before the import. In Vitest, `vi.stubGlobal` inside `beforeAll` runs after the module is imported. We need to move the stub to module scope (before the import) using the factory pattern:

Update `tests/unit/message-validator.test.ts` to hoist the stub:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id-abc' } });

// Import AFTER stubbing
import { isValidSender } from '../../src/security/message-validator';

describe('isValidSender', () => {
  it('returns true when sender.id matches chrome.runtime.id', () => {
    expect(isValidSender({ id: 'test-ext-id-abc' })).toBe(true);
  });

  it('returns false when sender.id differs', () => {
    expect(isValidSender({ id: 'malicious-extension' })).toBe(false);
  });

  it('returns false when sender has no id', () => {
    expect(isValidSender({})).toBe(false);
  });
});
```

Run:
```bash
npm run test:unit -- tests/unit/message-validator.test.ts
```
Expected: 3 passed.

- [ ] **Step 4: Write failing test for `idb-crypto.ts`**

Create `tests/unit/idb-crypto.test.ts`. The key challenges:
- `getOrCreateSessionKey` calls `chrome.storage.session.get` / `chrome.storage.session.set`
- `crypto.subtle` is available in jsdom — no mock needed

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for chrome.storage.session
const _store: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn(async (key: string) => ({ [key]: _store[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(_store, obj); }),
      remove: vi.fn(async (key: string) => { delete _store[key]; }),
    },
  },
});

import { getOrCreateSessionKey, encrypt, decrypt, clearSessionKey } from '../../src/security/idb-crypto';

beforeEach(() => {
  // Clear mock storage between tests so each test starts with a fresh key
  Object.keys(_store).forEach((k) => delete _store[k]);
  vi.clearAllMocks();
});

describe('encrypt / decrypt', () => {
  it('round-trips arbitrary bytes through AES-GCM', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const plaintext = new TextEncoder().encode('hello ToyoSnap 123');
    const ciphertext = await encrypt(key, plaintext.buffer);
    const recovered = await decrypt(key, ciphertext);
    expect(new TextDecoder().decode(recovered)).toBe('hello ToyoSnap 123');
  });

  it('ciphertext differs from plaintext', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const plaintext = new TextEncoder().encode('secret').buffer;
    const ciphertext = await encrypt(key, plaintext);
    // Ciphertext is longer (IV prepended) and differs in content
    expect(ciphertext.byteLength).toBeGreaterThan(plaintext.byteLength);
  });

  it('produces unique ciphertext on each call (random IV)', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const data = new TextEncoder().encode('same input').buffer;
    const c1 = new Uint8Array(await encrypt(key, data));
    const c2 = new Uint8Array(await encrypt(key, data));
    // The 12-byte IVs must differ
    const ivsDiffer = c1.slice(0, 12).some((byte, i) => byte !== c2[i]);
    expect(ivsDiffer).toBe(true);
  });
});

describe('getOrCreateSessionKey', () => {
  it('returns a CryptoKey', async () => {
    const key = await getOrCreateSessionKey();
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.type).toBe('secret');
  });

  it('caches key in storage on first call', async () => {
    await getOrCreateSessionKey();
    expect(vi.mocked(chrome.storage.session.set)).toHaveBeenCalledOnce();
  });

  it('reuses stored key on subsequent calls (no new set)', async () => {
    await getOrCreateSessionKey();
    vi.mocked(chrome.storage.session.set).mockClear();
    await getOrCreateSessionKey();
    expect(vi.mocked(chrome.storage.session.set)).not.toHaveBeenCalled();
  });

  it('key from first call can decrypt ciphertext from second call', async () => {
    const k1 = await getOrCreateSessionKey();
    const data = new TextEncoder().encode('cross-call test').buffer;
    const ciphertext = await encrypt(k1, data);

    // Simulate new call — same key should be loaded from storage
    const k2 = await getOrCreateSessionKey();
    const recovered = await decrypt(k2, ciphertext);
    expect(new TextDecoder().decode(recovered)).toBe('cross-call test');
  });
});

describe('clearSessionKey', () => {
  it('removes the key from session storage', async () => {
    await getOrCreateSessionKey();
    await clearSessionKey();
    expect(vi.mocked(chrome.storage.session.remove)).toHaveBeenCalledOnce();
    // After clearing, next call generates a fresh key (set is called again)
    vi.mocked(chrome.storage.session.set).mockClear();
    await getOrCreateSessionKey();
    expect(vi.mocked(chrome.storage.session.set)).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 5: Run to verify both test files pass**

```bash
npm run test:unit -- tests/unit/idb-crypto.test.ts tests/unit/message-validator.test.ts
```
Expected: 10 passed (3 + 7).

- [ ] **Step 6: Run full unit suite and confirm no regressions**

```bash
npm run test:unit
```
Expected: 62 passed (52 + 10).

- [ ] **Step 7: Commit**

```bash
git add tests/unit/idb-crypto.test.ts tests/unit/message-validator.test.ts
git commit -m "Add unit tests for idb-crypto and message-validator to meet 80% security coverage"
```

---

## Task 3: Ledger Module Unit Tests

`src/ledger/` is at 49.09% coverage. `ledger-resolver.ts` is already tested (4 tests). The gap is `global-ledger.ts`, `local-override-ledger.ts`, and `ledger-hooks.ts`.

**Files:**
- Create: `tests/unit/global-ledger.test.ts`
- Create: `tests/unit/local-override-ledger.test.ts`
- Create: `tests/unit/ledger-hooks.test.ts`

- [ ] **Step 1: Write failing tests for `global-ledger.ts`**

Create `tests/unit/global-ledger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/storage/ephemeral-db', () => ({
  putGlobalLedgerEntry: vi.fn(),
  getGlobalLedgerEntry: vi.fn(),
  getAllGlobalLedgerEntries: vi.fn(),
  deleteGlobalLedgerEntry: vi.fn(),
}));

import { addOrUpdateGlobal, getGlobal, getAllGlobal, removeGlobal } from '../../src/ledger/global-ledger';
import * as db from '../../src/storage/ephemeral-db';
import type { LedgerEntry } from '../../src/types/ledger';

const ENTRY: LedgerEntry = {
  id: 'g-1',
  operationType: 'redact',
  rrwebId: 'node-123',
  elementSelector: '#email',
  applyGlobally: true,
  replacementText: '[REDACTED]',
  createdAt: 1000,
  updatedAt: 1000,
};

beforeEach(() => { vi.clearAllMocks(); });

describe('addOrUpdateGlobal', () => {
  it('calls putGlobalLedgerEntry with updatedAt refreshed', async () => {
    const before = Date.now();
    await addOrUpdateGlobal(ENTRY);
    const after = Date.now();
    expect(db.putGlobalLedgerEntry).toHaveBeenCalledOnce();
    const saved = vi.mocked(db.putGlobalLedgerEntry).mock.calls[0][0];
    expect(saved.id).toBe('g-1');
    expect(saved.updatedAt).toBeGreaterThanOrEqual(before);
    expect(saved.updatedAt).toBeLessThanOrEqual(after);
  });
});

describe('getGlobal', () => {
  it('delegates to getGlobalLedgerEntry', async () => {
    vi.mocked(db.getGlobalLedgerEntry).mockResolvedValue(ENTRY);
    const result = await getGlobal('g-1');
    expect(db.getGlobalLedgerEntry).toHaveBeenCalledWith('g-1');
    expect(result?.id).toBe('g-1');
  });

  it('returns undefined for unknown id', async () => {
    vi.mocked(db.getGlobalLedgerEntry).mockResolvedValue(undefined);
    expect(await getGlobal('missing')).toBeUndefined();
  });
});

describe('getAllGlobal', () => {
  it('returns all entries from db', async () => {
    vi.mocked(db.getAllGlobalLedgerEntries).mockResolvedValue([ENTRY]);
    const result = await getAllGlobal();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g-1');
  });
});

describe('removeGlobal', () => {
  it('delegates to deleteGlobalLedgerEntry', async () => {
    vi.mocked(db.deleteGlobalLedgerEntry).mockResolvedValue(undefined);
    await removeGlobal('g-1');
    expect(db.deleteGlobalLedgerEntry).toHaveBeenCalledWith('g-1');
  });
});
```

- [ ] **Step 2: Run to verify it fails (module not mocked yet — imports will resolve)**

```bash
npm run test:unit -- tests/unit/global-ledger.test.ts
```
Expected: 5 passed (mocks are hoisted via `vi.mock`, so this should pass immediately; if any fail, the mock factory is missing a function — add it and re-run).

- [ ] **Step 3: Write tests for `local-override-ledger.ts`**

Create `tests/unit/local-override-ledger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/storage/ephemeral-db', () => ({
  putLocalLedgerEntry: vi.fn(),
  getLocalLedgerEntry: vi.fn(),
}));

import { addOrUpdateLocal, getLocal } from '../../src/ledger/local-override-ledger';
import * as db from '../../src/storage/ephemeral-db';
import type { LedgerEntry } from '../../src/types/ledger';

const ENTRY: LedgerEntry = {
  id: 'l-1',
  operationType: 'blur',
  rrwebId: 'node-456',
  elementSelector: '#ssn',
  applyGlobally: false,
  replacementText: '',
  createdAt: 2000,
  updatedAt: 2000,
};

beforeEach(() => { vi.clearAllMocks(); });

describe('addOrUpdateLocal', () => {
  it('calls putLocalLedgerEntry with sessionId, stepId, and updated entry', async () => {
    const before = Date.now();
    await addOrUpdateLocal('sess-1', 'step-1', ENTRY);
    const after = Date.now();
    expect(db.putLocalLedgerEntry).toHaveBeenCalledOnce();
    const [sid, stepId, saved] = vi.mocked(db.putLocalLedgerEntry).mock.calls[0];
    expect(sid).toBe('sess-1');
    expect(stepId).toBe('step-1');
    expect(saved.id).toBe('l-1');
    expect(saved.updatedAt).toBeGreaterThanOrEqual(before);
    expect(saved.updatedAt).toBeLessThanOrEqual(after);
  });
});

describe('getLocal', () => {
  it('returns entry when found', async () => {
    vi.mocked(db.getLocalLedgerEntry).mockResolvedValue(ENTRY);
    const result = await getLocal('sess-1', 'step-1', 'node-456');
    expect(db.getLocalLedgerEntry).toHaveBeenCalledWith('sess-1', 'step-1', 'node-456');
    expect(result?.id).toBe('l-1');
  });

  it('returns undefined when not found', async () => {
    vi.mocked(db.getLocalLedgerEntry).mockResolvedValue(undefined);
    expect(await getLocal('sess-x', 'step-x', 'no-node')).toBeUndefined();
  });
});
```

- [ ] **Step 4: Write tests for `ledger-hooks.ts`**

Create `tests/unit/ledger-hooks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LedgerEntry } from '../../src/types/ledger';

vi.mock('../../src/ledger/global-ledger', () => ({
  getAllGlobal: vi.fn(),
}));

import { useGlobalLedger } from '../../src/ledger/ledger-hooks';
import * as globalLedger from '../../src/ledger/global-ledger';

const ENTRY: LedgerEntry = {
  id: 'g-2',
  operationType: 'redact',
  rrwebId: 'node-99',
  elementSelector: '#dob',
  applyGlobally: true,
  replacementText: '[DOB]',
  createdAt: 3000,
  updatedAt: 3000,
};

beforeEach(() => { vi.clearAllMocks(); });

describe('useGlobalLedger', () => {
  it('starts in loading state', () => {
    vi.mocked(globalLedger.getAllGlobal).mockResolvedValue([]);
    const { result } = renderHook(() => useGlobalLedger());
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toHaveLength(0);
  });

  it('loads entries and clears loading flag', async () => {
    vi.mocked(globalLedger.getAllGlobal).mockResolvedValue([ENTRY]);
    const { result } = renderHook(() => useGlobalLedger());
    await act(async () => {
      // Wait for the async useEffect to settle
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('g-2');
  });

  it('handles empty ledger', async () => {
    vi.mocked(globalLedger.getAllGlobal).mockResolvedValue([]);
    const { result } = renderHook(() => useGlobalLedger());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Run all three new test files**

```bash
npm run test:unit -- tests/unit/global-ledger.test.ts tests/unit/local-override-ledger.test.ts tests/unit/ledger-hooks.test.ts
```
Expected: 10 passed (5 + 2 + 3).

- [ ] **Step 6: Run full unit suite**

```bash
npm run test:unit
```
Expected: 72 passed (62 + 10).

- [ ] **Step 7: Commit**

```bash
git add tests/unit/global-ledger.test.ts tests/unit/local-override-ledger.test.ts tests/unit/ledger-hooks.test.ts
git commit -m "Add ledger module unit tests to meet 80% ledger coverage threshold"
```

---

## Task 4: Storage Module Unit Tests

`src/storage/` is at 0% coverage. Three files: `blob-registry.ts` (pure in-memory), `ephemeral-db.ts` (IDB CRUD + encryption), `purge.ts` (IDB transactions + key/session teardown). All are tested by mocking `getDB` and `idb-crypto` at module boundary — no real IDB required.

**Files:**
- Create: `tests/unit/blob-registry.test.ts`
- Create: `tests/unit/ephemeral-db.test.ts`
- Create: `tests/unit/purge.test.ts`

- [ ] **Step 1: Write tests for `blob-registry.ts`**

`blob-registry.ts` uses `URL.createObjectURL` and `URL.revokeObjectURL`, which are not implemented in jsdom. Spy on them before each test. The registry is module-level state — call `revokeAllBlobUrls()` in `afterEach` to reset it.

Create `tests/unit/blob-registry.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerBlobUrl,
  getBlobUrl,
  revokeBlobUrl,
  revokeAllBlobUrls,
} from '../../src/storage/blob-registry';

let createSpy: ReturnType<typeof vi.spyOn>;
let revokeSpy: ReturnType<typeof vi.spyOn>;
let urlCounter = 0;

beforeEach(() => {
  urlCounter = 0;
  createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mock-url-${++urlCounter}`);
  revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  revokeAllBlobUrls(); // reset module-level Map
  vi.restoreAllMocks();
});

describe('registerBlobUrl', () => {
  it('returns a new object URL', () => {
    const url = registerBlobUrl('id-1', new ArrayBuffer(4), 'image/png');
    expect(url).toBe('blob:mock-url-1');
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('revokes previous URL before registering a new one for the same id', () => {
    registerBlobUrl('id-2', new ArrayBuffer(4), 'image/png');
    registerBlobUrl('id-2', new ArrayBuffer(4), 'image/png');
    // First URL must have been revoked when the second was registered
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    expect(createSpy).toHaveBeenCalledTimes(2);
  });
});

describe('getBlobUrl', () => {
  it('returns undefined for unregistered id', () => {
    expect(getBlobUrl('unknown')).toBeUndefined();
  });

  it('returns the registered url', () => {
    registerBlobUrl('id-3', new ArrayBuffer(4), 'image/jpeg');
    expect(getBlobUrl('id-3')).toBe('blob:mock-url-1');
  });
});

describe('revokeBlobUrl', () => {
  it('calls revokeObjectURL and removes the entry', () => {
    registerBlobUrl('id-4', new ArrayBuffer(4), 'image/png');
    revokeBlobUrl('id-4');
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    expect(getBlobUrl('id-4')).toBeUndefined();
  });

  it('is a no-op for unknown id', () => {
    revokeBlobUrl('not-registered');
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});

describe('revokeAllBlobUrls', () => {
  it('revokes every registered url and empties the registry', () => {
    registerBlobUrl('id-5', new ArrayBuffer(4), 'image/png');
    registerBlobUrl('id-6', new ArrayBuffer(4), 'image/png');
    revokeAllBlobUrls();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(getBlobUrl('id-5')).toBeUndefined();
    expect(getBlobUrl('id-6')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run blob-registry tests to verify they pass**

```bash
npm run test:unit -- tests/unit/blob-registry.test.ts
```
Expected: 7 passed.

- [ ] **Step 3: Write tests for `ephemeral-db.ts`**

Mock `getDB` to return a controlled object; mock `idb-crypto` so encrypt/decrypt are identity functions. This lets us test the CRUD orchestration logic (which store gets called, with what key) without needing real IndexedDB.

Create `tests/unit/ephemeral-db.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB — methods are spied individually per test
const mockDb = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
};

vi.mock('../../src/lib/idb', () => ({
  getDB: vi.fn(async () => mockDb),
}));

// Transparent encrypt/decrypt — lets us test rrweb path without crypto overhead
vi.mock('../../src/security/idb-crypto', () => ({
  getOrCreateSessionKey: vi.fn(async () => 'mock-key'),
  encrypt: vi.fn(async (_key: unknown, data: ArrayBuffer) => data),
  decrypt: vi.fn(async (_key: unknown, data: ArrayBuffer) => data),
}));

import {
  putSession, getSession,
  putBlob, getBlob,
  putStep, getStep,
  getStepsBySession, countStepsBySession,
  putGlobalLedgerEntry, getGlobalLedgerEntry, getAllGlobalLedgerEntries, deleteGlobalLedgerEntry,
  putDesignSystem, getDesignSystem,
  putActionLog, getActionLog,
} from '../../src/storage/ephemeral-db';
import type { CaptureSession, CaptureStep } from '../../src/types/capture';
import type { LedgerEntry } from '../../src/types/ledger';

const SESSION: CaptureSession = {
  id: 'sess-1',
  mode: 'image-chain',
  startedAt: 1000,
  endedAt: null,
  stepCount: 0,
  captureCursor: false,
  hostnames: [],
};

const IMAGE_STEP: CaptureStep = {
  sessionId: 'sess-1',
  stepIndex: 1,
  timestamp: 2000,
  url: 'https://example.com',
  pageTitle: 'Example',
  blobId: 'blob-abc',
  mimeType: 'image/png',
  rrwebEvents: null,
  actionStep: null,
  spotlightSelector: null,
};

const RRWEB_STEP: CaptureStep = {
  sessionId: 'sess-1',
  stepIndex: 2,
  timestamp: 3000,
  url: 'https://example.com',
  pageTitle: 'Example',
  blobId: null,
  rrwebEvents: [{ type: 4, data: {}, timestamp: 3000 }] as CaptureStep['rrwebEvents'],
  actionStep: null,
  spotlightSelector: null,
};

const LEDGER_ENTRY: LedgerEntry = {
  id: 'l-1',
  operationType: 'blur',
  rrwebId: 'node-1',
  elementSelector: '#foo',
  applyGlobally: true,
  replacementText: '',
  createdAt: 100,
  updatedAt: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('putSession / getSession', () => {
  it('putSession calls db.put on "sessions" store', async () => {
    await putSession(SESSION);
    expect(mockDb.put).toHaveBeenCalledWith('sessions', SESSION);
  });

  it('getSession calls db.get on "sessions" store', async () => {
    mockDb.get.mockResolvedValue(SESSION);
    const result = await getSession('sess-1');
    expect(mockDb.get).toHaveBeenCalledWith('sessions', 'sess-1');
    expect(result?.id).toBe('sess-1');
  });
});

describe('putBlob / getBlob', () => {
  it('putBlob encrypts and stores in "blobs" store', async () => {
    const buf = new ArrayBuffer(8);
    await putBlob('b-1', buf);
    // encrypt is identity mock, so put receives the same buffer
    expect(mockDb.put).toHaveBeenCalledWith('blobs', buf, 'b-1');
  });

  it('getBlob retrieves and decrypts from "blobs" store', async () => {
    const buf = new ArrayBuffer(8);
    mockDb.get.mockResolvedValue(buf);
    const result = await getBlob('b-1');
    expect(mockDb.get).toHaveBeenCalledWith('blobs', 'b-1');
    expect(result).toBe(buf);
  });

  it('getBlob returns undefined for missing key', async () => {
    mockDb.get.mockResolvedValue(undefined);
    expect(await getBlob('missing')).toBeUndefined();
  });
});

describe('putStep', () => {
  it('stores image step without encryption (no rrwebEvents)', async () => {
    await putStep(IMAGE_STEP);
    expect(mockDb.put).toHaveBeenCalledWith('steps', IMAGE_STEP);
  });

  it('stores encrypted rrweb events in blobs store under derived key', async () => {
    await putStep(RRWEB_STEP);
    // Encrypted rrweb data stored as blob
    expect(mockDb.put).toHaveBeenCalledWith(
      'blobs',
      expect.any(ArrayBuffer),
      `rrweb-${RRWEB_STEP.sessionId}-${RRWEB_STEP.stepIndex}`
    );
    // Step stored with rrwebEvents nulled out
    const stepCall = mockDb.put.mock.calls.find((c) => c[0] === 'steps');
    expect(stepCall).toBeTruthy();
    expect(stepCall![1].rrwebEvents).toBeNull();
  });
});

describe('getStep', () => {
  it('returns plain step when no rrweb blob present', async () => {
    mockDb.get.mockImplementation(async (store: string, key: unknown) => {
      if (store === 'steps') return IMAGE_STEP;
      return undefined; // no rrweb blob
    });
    const result = await getStep('sess-1', 1);
    expect(result?.blobId).toBe('blob-abc');
    expect(result?.rrwebEvents).toBeNull();
  });

  it('decrypts and restores rrweb events when blob is present', async () => {
    const encoded = new TextEncoder().encode(JSON.stringify(RRWEB_STEP.rrwebEvents)).buffer;
    mockDb.get.mockImplementation(async (store: string) => {
      if (store === 'steps') return { ...RRWEB_STEP, rrwebEvents: null };
      return encoded; // rrweb blob
    });
    const result = await getStep('sess-1', 2);
    expect(result?.rrwebEvents).toEqual(RRWEB_STEP.rrwebEvents);
  });
});

describe('getStepsBySession', () => {
  it('queries using IDBKeyRange (not getAll without filter)', async () => {
    mockDb.getAll.mockResolvedValue([IMAGE_STEP]);
    const result = await getStepsBySession('sess-1');
    // Must pass a key range, not just the store name with no second arg
    expect(mockDb.getAll).toHaveBeenCalledWith('steps', expect.any(IDBKeyRange));
    expect(result).toHaveLength(1);
  });
});

describe('countStepsBySession', () => {
  it('returns the number of steps for the session', async () => {
    mockDb.getAll.mockResolvedValue([IMAGE_STEP]);
    expect(await countStepsBySession('sess-1')).toBe(1);
  });
});

describe('putGlobalLedgerEntry / getGlobalLedgerEntry / getAllGlobalLedgerEntries / deleteGlobalLedgerEntry', () => {
  it('put stores in globalLedger', async () => {
    await putGlobalLedgerEntry(LEDGER_ENTRY);
    expect(mockDb.put).toHaveBeenCalledWith('globalLedger', LEDGER_ENTRY);
  });

  it('get retrieves from globalLedger', async () => {
    mockDb.get.mockResolvedValue(LEDGER_ENTRY);
    expect((await getGlobalLedgerEntry('l-1'))?.id).toBe('l-1');
  });

  it('getAll returns all entries', async () => {
    mockDb.getAll.mockResolvedValue([LEDGER_ENTRY]);
    expect(await getAllGlobalLedgerEntries()).toHaveLength(1);
  });

  it('delete removes from globalLedger', async () => {
    await deleteGlobalLedgerEntry('l-1');
    expect(mockDb.delete).toHaveBeenCalledWith('globalLedger', 'l-1');
  });
});

describe('putDesignSystem / getDesignSystem', () => {
  it('put stores in designSystems', async () => {
    const ds = { sessionId: 'sess-1', colors: [], fonts: [] } as unknown as import('../../src/types/design-system').DesignSystem;
    await putDesignSystem(ds);
    expect(mockDb.put).toHaveBeenCalledWith('designSystems', ds);
  });

  it('get retrieves from designSystems', async () => {
    mockDb.get.mockResolvedValue({ sessionId: 'sess-1' });
    const result = await getDesignSystem('sess-1');
    expect(mockDb.get).toHaveBeenCalledWith('designSystems', 'sess-1');
    expect(result?.sessionId).toBe('sess-1');
  });
});

describe('putActionLog / getActionLog', () => {
  it('put stores with sessionId as key', async () => {
    await putActionLog('sess-1', []);
    expect(mockDb.put).toHaveBeenCalledWith('actionLogs', [], 'sess-1');
  });

  it('get retrieves by sessionId', async () => {
    mockDb.get.mockResolvedValue([]);
    await getActionLog('sess-1');
    expect(mockDb.get).toHaveBeenCalledWith('actionLogs', 'sess-1');
  });
});
```

**Note:** The `getStepsBySession` test asserts that `mockDb.getAll` is called with `IDBKeyRange` as the second argument. This test will **fail** until Task 5 is implemented (which fixes `getStepsBySession` to use `IDBKeyRange.bound`). This is intentional TDD — write the test now so it drives the implementation in Task 5.

- [ ] **Step 4: Run ephemeral-db tests — expect one failure on `getStepsBySession`**

```bash
npm run test:unit -- tests/unit/ephemeral-db.test.ts
```
Expected: 14 passed, 1 failed (`getStepsBySession: queries using IDBKeyRange`). This is the expected red state before Task 5.

- [ ] **Step 5: Write tests for `purge.ts`**

`purge.ts` uses a transaction. Mock `db.transaction` to return an object whose `objectStore` method returns an object with `clear`, `delete`, and `getAll` methods, plus a `done` promise.

Create `tests/unit/purge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a minimal mock transaction
function makeMockTx(storeData: Record<string, unknown[]> = {}) {
  const stores: Record<string, ReturnType<typeof makeMockStore>> = {};
  function makeMockStore(name: string) {
    return {
      clear: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async (range?: IDBKeyRange) => storeData[name] ?? []),
    };
  }
  return {
    objectStore: vi.fn((name: string) => {
      if (!stores[name]) stores[name] = makeMockStore(name);
      return stores[name];
    }),
    done: Promise.resolve(),
    _stores: stores,
  };
}

const mockDb = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  transaction: vi.fn(),
};

vi.mock('../../src/lib/idb', () => ({
  getDB: vi.fn(async () => mockDb),
}));

vi.mock('../../src/storage/blob-registry', () => ({
  revokeAllBlobUrls: vi.fn(),
}));

vi.mock('../../src/security/idb-crypto', () => ({
  clearSessionKey: vi.fn(async () => {}),
}));

vi.mock('../../src/lib/session-store', () => ({
  clearSessionControlPlane: vi.fn(async () => {}),
}));

import { purgeAll, purgeSession } from '../../src/storage/purge';
import * as blobRegistry from '../../src/storage/blob-registry';
import * as idbCrypto from '../../src/security/idb-crypto';
import * as sessionStore from '../../src/lib/session-store';

beforeEach(() => { vi.clearAllMocks(); });

describe('purgeAll', () => {
  it('revokes all blob URLs', async () => {
    const tx = makeMockTx();
    mockDb.transaction.mockReturnValue(tx);
    await purgeAll();
    expect(blobRegistry.revokeAllBlobUrls).toHaveBeenCalledOnce();
  });

  it('clears all IDB stores in a single transaction', async () => {
    const tx = makeMockTx();
    mockDb.transaction.mockReturnValue(tx);
    await purgeAll();
    expect(mockDb.transaction).toHaveBeenCalledOnce();
    // All expected stores must have been cleared
    const expectedStores = ['sessions', 'steps', 'blobs', 'globalLedger', 'localLedger', 'designSystems', 'actionLogs'];
    for (const name of expectedStores) {
      expect(tx.objectStore).toHaveBeenCalledWith(name);
      expect(tx._stores[name]?.clear).toHaveBeenCalled();
    }
  });

  it('clears session encryption key', async () => {
    const tx = makeMockTx();
    mockDb.transaction.mockReturnValue(tx);
    await purgeAll();
    expect(idbCrypto.clearSessionKey).toHaveBeenCalledOnce();
  });

  it('clears SW control plane', async () => {
    const tx = makeMockTx();
    mockDb.transaction.mockReturnValue(tx);
    await purgeAll();
    expect(sessionStore.clearSessionControlPlane).toHaveBeenCalledOnce();
  });
});

describe('purgeSession', () => {
  it('deletes session, designSystem, and actionLog records', async () => {
    const tx = makeMockTx();
    mockDb.transaction.mockReturnValue(tx);
    await purgeSession('sess-del');
    expect(tx.objectStore('sessions').delete).toHaveBeenCalledWith('sess-del');
    expect(tx.objectStore('designSystems').delete).toHaveBeenCalledWith('sess-del');
    expect(tx.objectStore('actionLogs').delete).toHaveBeenCalledWith('sess-del');
  });

  it('queries steps by session using IDBKeyRange', async () => {
    const tx = makeMockTx({ steps: [] });
    mockDb.transaction.mockReturnValue(tx);
    await purgeSession('sess-del');
    expect(tx.objectStore('steps').getAll).toHaveBeenCalledWith(expect.any(IDBKeyRange));
  });

  it('deletes steps and their blobs for the target session', async () => {
    const step = { sessionId: 'sess-del', stepIndex: 1, blobId: 'blob-x' };
    const tx = makeMockTx({ steps: [step] });
    mockDb.transaction.mockReturnValue(tx);
    await purgeSession('sess-del');
    expect(tx.objectStore('steps').delete).toHaveBeenCalledWith(['sess-del', 1]);
    expect(tx.objectStore('blobs').delete).toHaveBeenCalledWith('blob-x');
  });
});
```

**Note:** The `purgeSession` test `queries steps by session using IDBKeyRange` will also fail until Task 5 fixes `purge.ts`. This is expected.

- [ ] **Step 6: Run purge tests — expect two failures (IDBKeyRange assertions)**

```bash
npm run test:unit -- tests/unit/purge.test.ts
```
Expected: 5 passed, 2 failed (the two IDBKeyRange assertions — Task 5 will fix these).

- [ ] **Step 7: Commit current test files (red state intentional)**

```bash
git add tests/unit/blob-registry.test.ts tests/unit/ephemeral-db.test.ts tests/unit/purge.test.ts
git commit -m "Add storage module unit tests (blob-registry passing; ephemeral-db/purge red pending perf fix)"
```

---

## Task 5: Fix `getStepsBySession` Full-Table Scan

**Audit finding:** `src/storage/ephemeral-db.ts:92-96` — `db.getAll("steps")` loads every step in the database, then filters in JavaScript. On large sessions this is O(N) over all sessions. The `steps` store has compound key `[sessionId, stepIndex]` which IDB can scan by prefix.

Same pattern appears in `src/storage/purge.ts:49` inside the `purgeSession` transaction.

**Files:**
- Modify: `src/storage/ephemeral-db.ts` (lines 92-96, function `getStepsBySession`)
- Modify: `src/storage/purge.ts` (lines 48-51, inside `purgeSession` transaction)

- [ ] **Step 1: Confirm the failing tests from Task 4 are present**

```bash
npm run test:unit -- tests/unit/ephemeral-db.test.ts tests/unit/purge.test.ts
```
Expected: at least 3 failures (the two IDBKeyRange assertions + any cascading failures).

- [ ] **Step 2: Fix `getStepsBySession` in `ephemeral-db.ts`**

Current (lines 92-96):
```typescript
export async function getStepsBySession(sessionId: string): Promise<CaptureStep[]> {
  const db = await getDB();
  const all = await db.getAll("steps");
  return all.filter((s) => s.sessionId === sessionId).sort((a, b) => a.stepIndex - b.stepIndex);
}
```

Replace with:
```typescript
export async function getStepsBySession(sessionId: string): Promise<CaptureStep[]> {
  const db = await getDB();
  // Use the compound [sessionId, stepIndex] key to scan only the target session.
  // IDB returns results in ascending key order, so no explicit sort is needed.
  const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Infinity]);
  return db.getAll("steps", range);
}
```

`IDBKeyRange` is a global available in both the browser and jsdom.

- [ ] **Step 3: Fix the full-scan in `purge.ts`**

Current (lines 48-51 inside `purgeSession`):
```typescript
const allSteps = await tx.objectStore("steps").getAll();
for (const step of allSteps) {
  if (step.sessionId === sessionId) {
```

Replace with (remove the `if` guard since range already filters):
```typescript
const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Infinity]);
const sessionSteps = await tx.objectStore("steps").getAll(range);
for (const step of sessionSteps) {
```

The variable rename from `allSteps` → `sessionSteps` and loop variable `step` stays the same. The inner body (deleting step, blob, rrweb) stays unchanged.

- [ ] **Step 4: Run unit tests — all should pass now**

```bash
npm run test:unit
```
Expected: all passed (the IDBKeyRange assertions in ephemeral-db and purge tests are now green). Final count should be approximately 92 passed (72 from Tasks 1–3 + 20 from Task 4 + 0 new from Task 5 — the Task 4 tests drive this task).

- [ ] **Step 5: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/storage/ephemeral-db.ts src/storage/purge.ts
git commit -m "Fix O(N) full-table scan in getStepsBySession — use IDBKeyRange.bound on compound key"
```

---

## Self-Review

**1. Spec coverage:**

| Audit Finding | Severity | Task |
|---|---|---|
| Empty catch blocks (`editor-store.ts:31,35`) | Error | Task 1 ✓ |
| `rawMsg as any` in SW (`service-worker.ts:66`) | Security/Medium | Task 1 ✓ |
| `message: any` in `useSession.ts` | Warning | Task 1 ✓ |
| `src/security/` coverage < 80% | Critical | Task 2 ✓ |
| `src/ledger/` coverage < 80% | Critical | Task 3 ✓ |
| `src/storage/` coverage 0% | Critical | Task 4 + 5 ✓ |
| Inefficient `getAll` + filter | Medium | Task 5 ✓ |
| dompurify dual-license | High | Out of scope (manual) |
| GENAI-DISCLOSURE pending | Medium | Out of scope (manual) |
| TypeScript version mismatch | Low | Out of scope (monitor) |
| innerHTML in plan docs | Low | Out of scope (historical doc) |
| Pause/Resume, Onboarding Flow A | Medium | Out of scope (backlog) |

**2. Placeholder scan:** No TBD, TODO, or "add appropriate" phrases found.

**3. Type consistency:**
- `IDBKeyRange.bound([sessionId, 0], [sessionId, Infinity])` used consistently in both `ephemeral-db.ts` and `purge.ts`.
- `mockDb.getAll` receives `IDBKeyRange` in both `ephemeral-db.test.ts` and `purge.test.ts` assertions.
- `_store` map in `idb-crypto.test.ts` cleared in `beforeEach` — no cross-test contamination.
- `revokeAllBlobUrls()` called in `afterEach` of `blob-registry.test.ts` — registry state reset between tests.
