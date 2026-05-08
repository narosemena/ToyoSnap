# Keyboard Shortcut Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Alt+Shift+R` keyboard shortcut to start/stop ToyoSnap recording from any tab, without touching the popup, with full compatibility in `--headless=new` Chrome.

**Architecture:** Two parallel trigger paths route to the same `handleToggleCapture()` in the service worker: (1) `chrome.commands.onCommand` for native OS shortcut use in headed Chrome, and (2) a content script `keydown` listener that fires from `page.keyboard.press()` in Playwright headless. Both paths read/write the existing `SessionControlPlane` state — no new persistence layer. Onboarding surfaces the shortcut in the welcome page and the in-popup tour.

**Tech Stack:** Chrome MV3 `chrome.commands` API, TypeScript, React 19, Vitest

---

## Headless Compatibility Note

`chrome.commands.onCommand` fires from **OS-level** keypresses. In `--headless=new`, there is no OS-level keyboard input, so this event **never fires** from `page.keyboard.press()`. The content script `keydown` listener is the headless entry point — Playwright's `page.keyboard.press('Alt+Shift+R')` dispatches a real DOM `KeyboardEvent` that content scripts intercept.

Tested capture modes in headless:
- `svg`, `rrweb` — fully DOM-based, work fine headless ✅
- `image-chain` — uses `captureVisibleTab`, unreliable headless ⚠️

The shortcut default mode is configurable via `chrome.storage.local`:
```javascript
// Set once before triggering:
await chrome.storage.local.set({ toyosnap_shortcut_mode: 'svg' });
```

---

## File Map

| File | Change |
|------|--------|
| `src/manifest.ts` | Add `commands` declaration |
| `src/types/messages.ts` | Add `TOGGLE_CAPTURE` to `ExtensionMessage` union |
| `src/background/service-worker.ts` | Add `onCommand` listener, `TOGGLE_CAPTURE` case, `handleToggleCapture()`, make `sendResponse` optional in `handleStartCapture` |
| `src/content/content-script.ts` | Add `keydown` listener (headless compat) |
| `src/welcome/welcome.tsx` | Add keyboard shortcut card |
| `src/popup/components/OnboardingTour.tsx` | Add 4th slide about the shortcut |
| `tests/unit/keyboard-shortcut.test.ts` | New — unit tests for toggle handler + keydown listener |

---

## Task 1: Manifest + Message Type

**Files:**
- Modify: `src/manifest.ts`
- Modify: `src/types/messages.ts`

- [ ] **Step 1: Add `commands` to manifest**

In `src/manifest.ts`, add the `commands` property to the exported object, after the `action` block:

```typescript
  commands: {
    "toggle-capture": {
      suggested_key: { default: "Alt+Shift+R" },
      description: "Start or stop ToyoSnap recording",
    },
  },
```

The full relevant section of `src/manifest.ts` should look like:

```typescript
  action: {
    default_popup: "src/popup/popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  commands: {
    "toggle-capture": {
      suggested_key: { default: "Alt+Shift+R" },
      description: "Start or stop ToyoSnap recording",
    },
  },
  options_page: "src/options/options.html",
```

- [ ] **Step 2: Add `TOGGLE_CAPTURE` to the message union**

In `src/types/messages.ts`, add one line to the `ExtensionMessage` union:

```typescript
export type ExtensionMessage =
  | { type: "START_CAPTURE"; payload: { mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  | { type: "STOP_CAPTURE" }
  | { type: "TOGGLE_CAPTURE" }                              // ← add this line
  | { type: "BEGIN_CAPTURE"; payload: { sessionId: string; mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  // ... rest unchanged
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/manifest.ts src/types/messages.ts
git commit -m "feat: declare toggle-capture command and TOGGLE_CAPTURE message type"
```

---

## Task 2: Service Worker — Toggle Handler

**Files:**
- Modify: `src/background/service-worker.ts`
- Create: `tests/unit/keyboard-shortcut.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/keyboard-shortcut.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// isValidSender would reject test senders — mock it so the message handler runs.
vi.mock('@/security/message-validator', () => ({ isValidSender: () => true }));

function makeChromeMock(isRecording: boolean) {
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
      getURL: (p: string) => `chrome-extension://test/${p}`,
      lastError: null,
      id: 'test-ext-id',
    },
    commands: {
      onCommand: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com' }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true }),
      create: vi.fn(),
      onUpdated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    storage: {
      session: {
        setAccessLevel: vi.fn(),
        get: vi.fn().mockResolvedValue({
          toyosnap_session: isRecording
            ? { isRecording: true, activeSessionId: 'sess-1', activeTabId: 42, captureMode: 'svg', captureCursor: false }
            : undefined,
        }),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

describe('toggle-capture command handler', () => {
  beforeEach(() => { vi.resetModules(); });

  it('starts capture when not recording', async () => {
    const chrome = makeChromeMock(false);
    vi.stubGlobal('chrome', chrome);
    vi.stubGlobal('crypto', { randomUUID: () => 'new-session-id' });

    await import('@/background/service-worker');

    const onCommandListener = chrome.commands.onCommand.addListener.mock.calls[0]?.[0];
    expect(onCommandListener).toBeDefined();
    await onCommandListener('toggle-capture');

    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'BEGIN_CAPTURE' })
    );
  });

  it('stops capture when already recording', async () => {
    const chrome = makeChromeMock(true);
    vi.stubGlobal('chrome', chrome);

    await import('@/background/service-worker');

    const onCommandListener = chrome.commands.onCommand.addListener.mock.calls[0]?.[0];
    await onCommandListener('toggle-capture');

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'END_CAPTURE' })
    );
  });

  it('ignores unknown commands', async () => {
    const chrome = makeChromeMock(false);
    vi.stubGlobal('chrome', chrome);

    await import('@/background/service-worker');

    const onCommandListener = chrome.commands.onCommand.addListener.mock.calls[0]?.[0];
    await onCommandListener('some-other-command');

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

describe('TOGGLE_CAPTURE message handler', () => {
  beforeEach(() => { vi.resetModules(); });

  it('starts capture via TOGGLE_CAPTURE message when not recording', async () => {
    const chrome = makeChromeMock(false);
    vi.stubGlobal('chrome', chrome);
    vi.stubGlobal('crypto', { randomUUID: () => 'msg-session-id' });

    await import('@/background/service-worker');

    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
    onMessageListener({ type: 'TOGGLE_CAPTURE' }, { tab: { id: 42 } }, vi.fn());
    await new Promise((r) => setTimeout(r, 10));

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'BEGIN_CAPTURE' })
    );
  });

  it('stops capture via TOGGLE_CAPTURE message when recording', async () => {
    const chrome = makeChromeMock(true);
    vi.stubGlobal('chrome', chrome);

    await import('@/background/service-worker');

    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
    onMessageListener({ type: 'TOGGLE_CAPTURE' }, { tab: { id: 42 } }, vi.fn());
    await new Promise((r) => setTimeout(r, 10));

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'END_CAPTURE' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/keyboard-shortcut.test.ts
```

Expected: FAIL — `chrome.commands.onCommand` not registered, `TOGGLE_CAPTURE` not handled.

- [ ] **Step 3: Implement in service-worker.ts**

**3a.** Make `sendResponse` optional in `handleStartCapture` (change the signature default):

```typescript
async function handleStartCapture(
  mode: CaptureMode,
  captureCursor: boolean,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: any) => void = () => {},
  imageFormat?: "png" | "jpeg"
): Promise<void> {
```

**3b.** Add `TOGGLE_CAPTURE` to the `switch` block in `onMessage.addListener` (after the `STOP_CAPTURE` case):

```typescript
      case "TOGGLE_CAPTURE":
        void handleToggleCapture();
        sendResponse({ ok: true });
        break;
```

**3c.** Register the `chrome.commands.onCommand` listener at the bottom of the file, after `chrome.runtime.onInstalled.addListener`. Add:

```typescript
// —— Keyboard shortcut ——————————————————————————————————————————————————————

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-capture") void handleToggleCapture();
});
```

**3d.** Add `handleToggleCapture` function after `handleStopCapture`:

```typescript
async function handleToggleCapture(): Promise<void> {
  const plane = await getSessionControlPlane();
  if (plane?.isRecording) {
    await handleStopCapture();
    return;
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;
  const stored = await chrome.storage.local.get("toyosnap_shortcut_mode");
  const mode = (stored["toyosnap_shortcut_mode"] as CaptureMode) ?? "image-chain";
  await handleStartCapture(mode, false, { tab: activeTab } as chrome.runtime.MessageSender);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/keyboard-shortcut.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Typecheck + full unit suite**

```bash
npm run typecheck && npm run test:unit
```

Expected: 0 errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/background/service-worker.ts tests/unit/keyboard-shortcut.test.ts
git commit -m "feat: add toggle-capture command handler and TOGGLE_CAPTURE message in service worker"
```

---

## Task 3: Content Script — Headless Keydown Listener

**Files:**
- Modify: `src/content/content-script.ts`
- Modify: `tests/unit/keyboard-shortcut.test.ts`

- [ ] **Step 1: Add keydown test cases**

Append to `tests/unit/keyboard-shortcut.test.ts`:

```typescript
// Content script tests use a single import (vi.resetModules in beforeAll)
// so the keydown listener is registered once and sendMessage is cleared between tests.
describe('content script keydown listener', () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    vi.resetModules();
    sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: { addListener: vi.fn() },
        sendMessage,
        id: 'test-ext-id',
      },
      storage: {
        session: { get: vi.fn().mockResolvedValue({}) },
      },
    });
    await import('@/content/content-script');
  });

  beforeEach(() => { sendMessage.mockClear(); });

  it('sends TOGGLE_CAPTURE on Alt+Shift+R', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyR', altKey: true, shiftKey: true, bubbles: true, cancelable: true,
    }));
    expect(sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_CAPTURE' });
  });

  it('does NOT send TOGGLE_CAPTURE when Alt is missing', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyR', shiftKey: true, bubbles: true,
    }));
    expect(sendMessage).not.toHaveBeenCalledWith({ type: 'TOGGLE_CAPTURE' });
  });

  it('does NOT send TOGGLE_CAPTURE on Alt+Shift+Q', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyQ', altKey: true, shiftKey: true, bubbles: true,
    }));
    expect(sendMessage).not.toHaveBeenCalledWith({ type: 'TOGGLE_CAPTURE' });
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run tests/unit/keyboard-shortcut.test.ts --reporter=verbose 2>&1 | grep "content script"
```

Expected: 3 content script tests FAIL.

- [ ] **Step 3: Add keydown listener to content-script.ts**

Append to `src/content/content-script.ts` after the self-resume block:

```typescript
// ── Keyboard shortcut: Alt+Shift+R → toggle capture ──────────────────────────
// Uses keydown (not chrome.commands) so this fires in --headless=new via
// Playwright's page.keyboard.press('Alt+Shift+R'), which dispatches a real
// DOM KeyboardEvent. chrome.commands.onCommand only fires from OS-level input.

document.addEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (e.code === "KeyR" && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "TOGGLE_CAPTURE" } as ExtensionMessage);
    }
  },
  { capture: true }
);
```

- [ ] **Step 4: Run all keyboard-shortcut tests**

```bash
npx vitest run tests/unit/keyboard-shortcut.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Full unit suite**

```bash
npm run test:unit
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/content/content-script.ts tests/unit/keyboard-shortcut.test.ts
git commit -m "feat: add keydown listener in content script for headless shortcut compat"
```

---

## Task 4: Onboarding — Surface the Shortcut

**Files:**
- Modify: `src/welcome/welcome.tsx`
- Modify: `src/popup/components/OnboardingTour.tsx`

- [ ] **Step 1: Add keyboard shortcut card to welcome.tsx**

In `src/welcome/welcome.tsx`, add a second action card after the existing "Pin ToyoSnap to your toolbar" card. The existing card closes with `</div>` at the end of the `<div className="rounded-[12px] p-[18px_20px]...">` block. Add the new card immediately after it:

```tsx
        <div
          className="rounded-[12px] p-[18px_20px] flex items-center gap-[14px] text-left mt-3"
          style={{ background: '#fff', border: '1px dashed oklch(0.86 0.05 258)' }}
        >
          <div
            className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center"
            style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true"
            >
              <rect x="2" y="5" width="16" height="11" rx="2"/>
              <path d="M6 9h1m3 0h1m3 0h1M6 13h8"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>
              Keyboard shortcut
            </div>
            <div className="text-[12px]" style={{ color: '#6a7180' }}>
              Press <kbd style={{ fontFamily: 'monospace', background: '#f4f5f8', padding: '1px 5px', borderRadius: 4, border: '1px solid #d4d8e0' }}>Alt+Shift+R</kbd> to start or stop recording from any tab.
              Customize at <span style={{ fontFamily: 'monospace', fontSize: 11 }}>chrome://extensions/shortcuts</span>.
            </div>
          </div>
          <span
            className="text-[11px] px-[10px] py-[6px] rounded-[6px] whitespace-nowrap"
            style={{ color: '#454c5a', background: '#f4f5f8', fontFamily: 'monospace' }}
          >
            Alt+Shift+R
          </span>
        </div>
```

- [ ] **Step 2: Add keyboard shortcut slide to OnboardingTour.tsx**

In `src/popup/components/OnboardingTour.tsx`:

**2a.** Add `keyboard` to `ICON_PATHS`:

```typescript
const ICON_PATHS: Record<string, string> = {
  record:   'M6 6h8v8H6z',
  cursor:   'M4 4l6 14 2.5-5.5L18 10z',
  download: 'M10 3v10m0 0l-4-4m4 4l4-4M3 17h14',
  keyboard: 'M2 5h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zm3 4h1m3 0h1m3 0h1M5 13h10',
};
```

**2b.** Add the 4th slide to `SLIDES`:

```typescript
const SLIDES = [
  {
    icon: 'record',
    title: 'Choose a capture mode',
    body: 'PNG chain for step guides. SVG for editable vectors. HTML for interactive replay.',
  },
  {
    icon: 'cursor',
    title: 'Record on any page',
    body: 'Click the browser tab you want to capture, then Start. Every click becomes a step.',
  },
  {
    icon: 'download',
    title: 'Review, sanitize, export',
    body: 'Blur PII in Studio, then export locally as .zip, .webm, .html or Markdown.',
  },
  {
    icon: 'keyboard',
    title: 'Keyboard shortcut',
    body: 'Press Alt+Shift+R to start or stop recording without opening this popup. Change it at chrome://extensions/shortcuts.',
  },
];
```

- [ ] **Step 3: Build to verify no JSX errors**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/welcome/welcome.tsx src/popup/components/OnboardingTour.tsx
git commit -m "feat: surface keyboard shortcut in welcome screen and onboarding tour"
```

---

## Task 5: Final Validation

- [ ] **Step 1: Full unit suite**

```bash
npm run test:unit
```

Expected: all 112+ tests pass (new tests included).

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 3: Verify manifest output contains commands**

```bash
node -e "const m = require('./dist/manifest.json'); console.log(JSON.stringify(m.commands, null, 2))"
```

Expected output:
```json
{
  "toggle-capture": {
    "suggested_key": {
      "default": "Alt+Shift+R"
    },
    "description": "Start or stop ToyoSnap recording"
  }
}
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: keyboard shortcut toggle — Alt+Shift+R starts/stops recording, headless-compatible"
```

---

## Manual Smoke Test (after loading the built extension)

1. `npm run build` → load `dist/` in Chrome via `chrome://extensions` (Developer mode, Load unpacked).
2. Navigate to any page (e.g. `https://example.com`).
3. Press `Alt+Shift+R` → extension badge should show **REC**, recording overlay should appear.
4. Press `Alt+Shift+R` again → recording stops, Studio tab opens.
5. Visit `chrome://extensions/shortcuts` → confirm "Start or stop ToyoSnap recording" appears with `Alt+Shift+R` default.
6. Uninstall and reinstall → welcome screen should show the keyboard shortcut card.

**Headless smoke test** (requires Playwright + `--headless=new`):
```typescript
// In a Playwright test or script:
const context = await chromium.launchPersistentContext('', {
  headless: false,  // use true for --headless=new after confirming headed works
  args: [
    '--load-extension=./dist',
    '--disable-extensions-except=./dist',
  ],
});
const page = await context.newPage();
await page.goto('https://example.com');
// Set svg mode for headless compat:
await page.evaluate(() =>
  chrome.storage.local.set({ toyosnap_shortcut_mode: 'svg' })
);
await page.keyboard.press('Alt+Shift+R'); // fires content script keydown listener
await page.waitForTimeout(500);
// Verify badge or session state
await page.keyboard.press('Alt+Shift+R'); // stop
```
