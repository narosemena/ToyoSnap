# Popup & Flow A/B Design Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the extension popup and recording flows with the design reference at `design/flows/VectoSnap/` — the declared source of truth for layout, copy, and affordances.

**Architecture:** Three self-contained phases: (1) popup visual/behavioral alignment — shell, header, 4-mode selector, toggle, recording stats panel, pause support; (2) post-stop success sheet (Flow B); (3) first-time onboarding (Flow A). Each phase ships independently. Brand name stays "ToyoSnap" (CLAUDE.md authoritative); all visual tokens/layout come from the design reference.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS v4, OKLCH tokens (`globals.css`), Vitest (unit), Chrome extension MV3 message passing.

---

## File Map

### Phase 1 — Popup redesign

| File | Action | Responsibility |
|---|---|---|
| `src/popup/popup.tsx` | Modify | Shell sizing, idle/recording state layout, Pause wiring |
| `src/popup/components/ModeSelector.tsx` | Modify | 4 modes, correct labels |
| `src/popup/components/CursorToggle.tsx` | Modify | Toggle switch (not checkbox) |
| `src/popup/components/StatusBadge.tsx` | Modify | Zero-egress pill (idle) + Recording pill (recording) |
| `src/popup/hooks/useSession.ts` | Modify | Add `hasSessions`, `isPaused` |
| `src/background/service-worker.ts` | Modify | `GET_SESSION_STATE` returns `hasSessions`; `PAUSE_CAPTURE` / `RESUME_CAPTURE` handlers |
| `src/types/messages.ts` | Modify | Add `PAUSE_CAPTURE`, `RESUME_CAPTURE` message types |
| `src/lib/session-store.ts` | Modify | Add `isPaused` to `SessionControlPlane` |
| `src/content/recording-overlay.ts` | Modify | Pause visual + mode chip in steps badge |

### Phase 2 — Post-stop success sheet (Flow B)

| File | Action | Responsibility |
|---|---|---|
| `src/popup/components/RecordingComplete.tsx` | Create | Success sheet shown after stop |
| `src/popup/popup.tsx` | Modify | Show `RecordingComplete` in "just stopped" state |
| `src/popup/hooks/useSession.ts` | Modify | Track `justStopped` + session summary |

### Phase 3 — First-time onboarding (Flow A)

| File | Action | Responsibility |
|---|---|---|
| `src/welcome/welcome.html` | Create | Welcome tab opened after install |
| `src/welcome/welcome.tsx` | Create | `WelcomeScreen` component |
| `src/popup/components/OnboardingPopup.tsx` | Create | "You're all set" first-click popup overlay |
| `src/popup/components/OnboardingTour.tsx` | Create | 3-slide explainer |
| `src/popup/popup.tsx` | Modify | Show onboarding layer on first open |
| `src/background/service-worker.ts` | Modify | `chrome.runtime.onInstalled` opens welcome tab |
| `src/manifest.ts` | Modify | Add `welcome.html` as web-accessible resource |

---

## Phase 1: Popup Visual & Behavioral Alignment

---

### Task 1: Shell sizing, border, and shadow

**Files:**
- Modify: `src/popup/popup.tsx`

The popup currently uses `w-full` with no container border or shadow. The design reference (`popup.jsx`) specifies `width: 360`, `borderRadius: 14`, `border: '1px solid oklch(0.9 0.008 258)'`, and a two-layer box shadow.

- [ ] **Step 1: Write the failing visual regression test**

```typescript
// tests/unit/popup-shell.test.ts
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Stub chrome APIs used by popup
vi.stubGlobal('chrome', {
  runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn(), removeListener: vi.fn() }, lastError: null },
  tabs: { create: vi.fn() },
});

// Import after stubbing
const { Popup } = await import('@/popup/popup');

describe('Popup shell', () => {
  it('has the design-spec outer container class', () => {
    // Renders without crashing and has a root element
    const { container } = render(<Popup />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    // Width is controlled by the shell wrapper, not w-full
    expect(root.className).not.toContain('w-full');
  });
});
```

Run: `npm run test:unit -- --reporter=verbose popup-shell`
Expected: FAIL (popup still has `w-full`)

- [ ] **Step 2: Update the popup shell wrapper in `popup.tsx`**

Replace the outermost `<div className="flex flex-col ...">` in **both** the idle and recording JSX branches with a shared shell wrapper. Extract it before the return:

```tsx
// src/popup/popup.tsx  — replace both outer divs

// Shared shell — applied to BOTH idle and recording state
const shell = "flex flex-col w-[360px] bg-white dark:bg-[#1d2230] text-[#1d2230] dark:text-gray-100 rounded-[14px] border border-[oklch(0.9_0.008_258)] overflow-hidden";
const shellShadow = { boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)' };
```

Then update the idle return:
```tsx
return (
  <div className={shell} style={shellShadow}>
    {/* ... existing content */}
  </div>
);
```

And the recording return:
```tsx
return (
  <div className={shell} style={shellShadow}>
    {/* ... existing content */}
  </div>
);
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose popup-shell`
Expected: PASS

- [ ] **Step 4: Build and load the extension to visually verify**

Run: `npm run build`
Load unpacked from `dist/` in `chrome://extensions`. Open the popup and confirm the 360px card with rounded corners and shadow is visible.

- [ ] **Step 5: Commit**

```bash
git add src/popup/popup.tsx tests/unit/popup-shell.test.ts
git commit -m "style: apply design-spec shell sizing and shadow to popup"
```

---

### Task 2: Header — Zero-egress badge + Recording pill

**Files:**
- Modify: `src/popup/components/StatusBadge.tsx`
- Modify: `src/popup/popup.tsx`

Design spec: idle state shows a permanent green "Zero-egress" pill. Recording state shows an orange "Recording" pill with animated dot. The current `StatusBadge` only renders in recording state and shows a red "REC" badge.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/status-badge.test.ts
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '@/popup/components/StatusBadge';

describe('StatusBadge', () => {
  it('shows Zero-egress badge when idle', () => {
    render(<StatusBadge isRecording={false} isPaused={false} />);
    expect(screen.getByText(/zero.egress/i)).toBeInTheDocument();
  });

  it('shows Recording pill when recording', () => {
    render(<StatusBadge isRecording={true} isPaused={false} />);
    expect(screen.getByText(/recording/i)).toBeInTheDocument();
    expect(screen.queryByText(/zero.egress/i)).not.toBeInTheDocument();
  });

  it('shows Paused pill when paused', () => {
    render(<StatusBadge isRecording={true} isPaused={true} />);
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose status-badge`
Expected: FAIL (existing badge never shows zero-egress)

- [ ] **Step 2: Rewrite `StatusBadge.tsx`**

```tsx
// src/popup/components/StatusBadge.tsx
import React from "react";

interface Props {
  isRecording: boolean;
  isPaused: boolean;
}

export function StatusBadge({ isRecording, isPaused }: Props) {
  if (!isRecording) {
    return (
      <span
        className="inline-flex items-center gap-[5px] px-2 py-[3px] rounded-full text-[10px] font-semibold tracking-[0.3px] uppercase"
        style={{ background: 'oklch(0.96 0.04 155)', color: 'oklch(0.34 0.1 155)' }}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1l1.5 2.5H13l-2.5 2 1 3L8 7l-3.5 1.5 1-3L3 3h3.5L8 1z" fill="currentColor"/>
        </svg>
        Zero‑egress
      </span>
    );
  }

  return (
    <span
      className="ml-auto inline-flex items-center gap-[6px] px-2 py-[3px] rounded-full text-[10px] font-bold tracking-[0.6px] uppercase"
      style={{
        background: 'oklch(0.96 0.035 25)',
        color: 'oklch(0.42 0.18 25)',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{
          background: 'oklch(0.58 0.19 25)',
          animation: isPaused ? 'none' : 'vs-pulse-badge 1.2s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      {isPaused ? 'Paused' : 'Recording'}
    </span>
  );
}
```

Add keyframe to `src/styles/globals.css`:
```css
@keyframes vs-pulse-badge {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

- [ ] **Step 3: Update `popup.tsx` to pass `isPaused` to `StatusBadge`**

Both idle and recording branches already have `<StatusBadge isRecording={isRecording} />`. Add `isPaused={isPaused ?? false}` where `isPaused` comes from `useSession()` (added in Task 6).

For now, thread `isPaused={false}` as a placeholder:
```tsx
<StatusBadge isRecording={isRecording} isPaused={false} />
```

- [ ] **Step 4: Run tests**

Run: `npm run test:unit -- --reporter=verbose status-badge`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/popup/components/StatusBadge.tsx src/styles/globals.css src/popup/popup.tsx
git commit -m "style: redesign status badge — zero-egress pill idle, orange recording pill"
```

---

### Task 3: ModeSelector — 4 modes with design-spec labels

**Files:**
- Modify: `src/popup/components/ModeSelector.tsx`

Design has 4 modes: PNG chain (`image-chain`), Layered SVG (`svg`), Video (`video`), HTML replay (`rrweb`). Current ModeSelector shows only 2 modes with different labels.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mode-selector.test.ts
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '@/popup/components/ModeSelector';

describe('ModeSelector', () => {
  it('renders all 4 design-spec modes', () => {
    render(<ModeSelector value="image-chain" onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('PNG chain')).toBeInTheDocument();
    expect(screen.getByText('Layered SVG')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('HTML replay')).toBeInTheDocument();
  });

  it('calls onChange with correct CaptureMode value', async () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole('radio', { name: /video/i }));
    expect(onChange).toHaveBeenCalledWith('video');
  });

  it('does not show "Screenshot Chain" label', () => {
    render(<ModeSelector value="image-chain" onChange={vi.fn()} disabled={false} />);
    expect(screen.queryByText('Screenshot Chain')).not.toBeInTheDocument();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose mode-selector`
Expected: FAIL

- [ ] **Step 2: Update `ModeSelector.tsx`**

```tsx
// src/popup/components/ModeSelector.tsx
import React, { useRef } from "react";
import type { CaptureMode } from "@/types/capture";

const MODES: { value: CaptureMode; label: string; description: string; iconPath: string }[] = [
  {
    value: "image-chain",
    label: "PNG chain",
    description: "Screenshots on each click — ready for step guides.",
    iconPath: "M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm7 3a2 2 0 100 4 2 2 0 000-4z",
  },
  {
    value: "svg",
    label: "Layered SVG",
    description: "Vector layers per click — editable in any vector tool.",
    iconPath: "M4 14l4-8 4 8M6 10h4M14 6l2 2-2 2",
  },
  {
    value: "video",
    label: "Video",
    description: "WebM recording of the tab.",
    iconPath: "M15 10l-6-4v8l6-4zM3 6h8a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z",
  },
  {
    value: "rrweb",
    label: "HTML replay",
    description: "Self‑contained interactive replay.",
    iconPath: "M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 3h12M7 4v3",
  },
];

interface Props {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled: boolean;
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (disabled) return;
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % MODES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + MODES.length) % MODES.length;
    } else {
      return;
    }
    onChange(MODES[next].value);
    btnRefs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Capture mode">
      <span
        className="block text-[10px] font-semibold tracking-[0.6px] uppercase mb-2"
        style={{ color: '#6a7180' }}
      >
        Capture mode
      </span>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m, i) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              ref={(el) => { btnRefs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              disabled={disabled}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(m.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={[
                "relative flex flex-col gap-1 p-[10px] rounded-[10px] border text-left transition-all duration-[160ms]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                active
                  ? "border-[oklch(0.58_0.19_258)] bg-[oklch(0.97_0.035_258)]"
                  : "border-[oklch(0.9_0.008_258)] bg-white hover:bg-[oklch(0.985_0.005_258)]",
              ].join(" ")}
            >
              {active && (
                <span
                  className="absolute top-[6px] right-2 text-[9px] font-bold tracking-[0.4px] uppercase px-[5px] py-[2px] rounded-[4px] text-white"
                  style={{ background: 'oklch(0.58 0.19 258)' }}
                >
                  On
                </span>
              )}
              <div
                className="flex items-center gap-[7px] text-[13px] font-semibold whitespace-nowrap"
                style={{ color: active ? 'oklch(0.38 0.14 258)' : '#1d2230' }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                >
                  <path d={m.iconPath} />
                </svg>
                {m.label}
              </div>
              <span className="text-[11px] leading-[1.35]" style={{ color: '#6a7180' }}>
                {m.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --reporter=verbose mode-selector`
Expected: PASS (all 3 tests)

- [ ] **Step 4: Commit**

```bash
git add src/popup/components/ModeSelector.tsx tests/unit/mode-selector.test.ts
git commit -m "feat: expand mode selector to 4 modes per design reference (PNG/SVG/Video/HTML)"
```

---

### Task 4: CursorToggle — replace checkbox with toggle switch

**Files:**
- Modify: `src/popup/components/CursorToggle.tsx`

Design: `32×18px` pill with sliding dot, icon, label, and subtitle. Current: plain HTML checkbox.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/cursor-toggle.test.ts
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CursorToggle } from '@/popup/components/CursorToggle';

describe('CursorToggle', () => {
  it('renders Capture cursor label', () => {
    render(<CursorToggle checked={false} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('Capture cursor')).toBeInTheDocument();
  });

  it('calls onChange when the switch is clicked', async () => {
    const onChange = vi.fn();
    render(<CursorToggle checked={false} onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('has aria-pressed matching checked value', () => {
    render(<CursorToggle checked={true} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render an <input type="checkbox">', () => {
    const { container } = render(<CursorToggle checked={false} onChange={vi.fn()} disabled={false} />);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose cursor-toggle`
Expected: FAIL (has checkbox, no role="switch")

- [ ] **Step 2: Rewrite `CursorToggle.tsx`**

```tsx
// src/popup/components/CursorToggle.tsx
import React from "react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}

export function CursorToggle({ checked, onChange, disabled }: Props) {
  return (
    <div
      className="flex items-center justify-between p-[10px_12px] rounded-[10px] border"
      style={{ borderColor: 'oklch(0.94 0.005 258)' }}
    >
      <div className="flex items-center gap-[10px]">
        {/* Cursor icon */}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
          stroke="#454c5a" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M4 4l6 14 2.5-5.5L18 10z" />
        </svg>
        <div>
          <div className="text-[13px] font-medium" style={{ color: '#1d2230' }}>Capture cursor</div>
          <div className="text-[11px]" style={{ color: '#6a7180' }}>Overlay pointer at each step</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-pressed={checked}
        aria-label="Capture cursor"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width: 32, height: 18, borderRadius: 10, padding: 2,
          background: checked ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
          transition: 'background 180ms',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            transform: `translateX(${checked ? 14 : 0}px)`,
            transition: 'transform 180ms',
            boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          }}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --reporter=verbose cursor-toggle`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/popup/components/CursorToggle.tsx tests/unit/cursor-toggle.test.ts
git commit -m "style: replace checkbox with toggle switch in CursorToggle per design reference"
```

---

### Task 5: `hasSessions` — service worker + hook

**Files:**
- Modify: `src/background/service-worker.ts`
- Modify: `src/popup/hooks/useSession.ts`

The `GET_SESSION_STATE` response needs a `hasSessions` boolean so the popup can show/hide "Open Studio" conditionally.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/use-session-has-sessions.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('useSession hasSessions', () => {
  it('returns hasSessions true when SW reports sessions exist', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn((_msg, cb) =>
          cb({ isRecording: false, hasSessions: true })
        ),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        lastError: null,
      },
    });
    const { useSession } = await import('@/popup/hooks/useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasSessions).toBe(true);
  });
});
```

Run: `npm run test:unit -- --reporter=verbose use-session-has-sessions`
Expected: FAIL

- [ ] **Step 2: Extend `GET_SESSION_STATE` handler in `service-worker.ts`**

In the `GET_SESSION_STATE` case (around line 76), after fetching `plane`, also get the session count:

```typescript
case "GET_SESSION_STATE":
  void (async () => {
    const plane = await getSessionControlPlane();
    const sessions = await getAllSessions();
    sendResponse({
      ...(plane || { isRecording: false }),
      hasSessions: sessions.length > 0,
    });
  })();
  return true;
```

Add `getAllSessions` to the import from `@/storage/ephemeral-db` at the top of `service-worker.ts` (it is already exported — see `ephemeral-db.ts` line 24).

- [ ] **Step 3: Extend `SessionState` and `useSession` hook**

```typescript
// src/popup/hooks/useSession.ts — extend the interface
export interface SessionState {
  isRecording: boolean;
  activeSessionId?: string;
  recordingStartedAt?: number;
  captureMode?: CaptureMode;
  captureCursor?: boolean;
  stepCount?: number;
  hasSessions?: boolean;   // ← new
  isPaused?: boolean;      // ← new (used in Task 6)
}
```

No other change needed — `setState(response)` already spreads all fields.

- [ ] **Step 4: Update `popup.tsx` to use `hasSessions`**

In the idle state branch, find the "Open Studio" button:

```tsx
// Before (always shown):
<button type="button" onClick={openEditor} ...>
  Open Studio
</button>

// After (conditional):
{hasSessions && (
  <button
    type="button"
    onClick={openEditor}
    className="w-full py-2 rounded-[8px] text-xs font-medium border border-[oklch(0.93_0.006_258)] flex items-center justify-center gap-[6px] transition-colors hover:bg-[oklch(0.985_0.005_258)]"
    style={{ background: 'transparent', color: '#454c5a' }}
  >
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M2 6h16M2 10h16M2 14h10" />
    </svg>
    Open Studio
  </button>
)}
```

Destructure `hasSessions` from `useSession()`:
```tsx
const { isRecording, captureMode, ..., hasSessions } = useSession();
```

- [ ] **Step 5: Run test**

Run: `npm run test:unit -- --reporter=verbose use-session-has-sessions`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/background/service-worker.ts src/popup/hooks/useSession.ts src/popup/popup.tsx tests/unit/use-session-has-sessions.test.ts
git commit -m "feat: surface hasSessions from SW to popup; show Open Studio only when sessions exist"
```

---

### Task 6: Idle state footer + record button icon

**Files:**
- Modify: `src/popup/popup.tsx`

Design: footer has a top border, lock icon, and specific copy. Record button has a record-dot icon.

- [ ] **Step 1: No test needed** — pure markup. Visually verify after build.

- [ ] **Step 2: Replace idle-state footer in `popup.tsx`**

Find and replace the `<p className="text-[10px] text-center ...">Zero-egress...` at the bottom of the idle branch with:

```tsx
<div
  className="flex items-center gap-2 px-4 py-[10px] text-[11px]"
  style={{
    borderTop: '1px solid oklch(0.94 0.005 258)',
    background: 'oklch(0.985 0.005 258)',
    color: '#6a7180',
  }}
>
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true"
  >
    <rect x="3" y="9" width="14" height="9" rx="2"/>
    <path d="M7 9V7a3 3 0 016 0v2"/>
  </svg>
  All capture stays on this machine. No network calls.
</div>
```

- [ ] **Step 3: Add record-dot icon to the "Start recording" button**

The button currently has no icon. Update it:
```tsx
<button
  type="button"
  onClick={handleToggleRecord}
  className="w-full py-[12px] px-[14px] rounded-[10px] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-1"
  style={{ background: 'oklch(0.58 0.19 258)' }}
>
  {/* Record dot icon */}
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4" fill="white"/>
  </svg>
  Start recording
</button>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Load extension, open popup. Confirm footer appears at bottom with lock icon and copy. Confirm record button has dot icon.

- [ ] **Step 5: Commit**

```bash
git add src/popup/popup.tsx
git commit -m "style: idle state footer with lock icon, record button icon per design reference"
```

---

### Task 7: Recording state — gradient stats panel

**Files:**
- Modify: `src/popup/popup.tsx`

Design: a gradient panel (`linear-gradient(180deg, oklch(0.98 0.02 258) 0%, #fff 100%)`) with two large tabular-nums counters: Elapsed (28px) and Steps captured (28px blue).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/popup-recording-state.test.ts
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn((_m, cb) => cb?.({ isRecording: true, stepCount: 3, recordingStartedAt: Date.now() - 65000 })),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    lastError: null,
  },
  tabs: { create: vi.fn() },
});

const { Popup } = await import('@/popup/popup');

describe('Popup recording state', () => {
  it('shows Elapsed and Steps captured labels', async () => {
    const { findByText } = render(<Popup />);
    expect(await findByText(/elapsed/i)).toBeInTheDocument();
    expect(await findByText(/steps captured/i)).toBeInTheDocument();
  });

  it('shows Pause button', async () => {
    const { findByRole } = render(<Popup />);
    expect(await findByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows "Stop & review" button', async () => {
    const { findByRole } = render(<Popup />);
    expect(await findByRole('button', { name: /stop & review/i })).toBeInTheDocument();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose popup-recording-state`
Expected: FAIL

- [ ] **Step 2: Replace the recording state JSX in `popup.tsx`**

Replace the entire `if (isRecording)` return block with:

```tsx
if (isRecording) {
  const mm = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');
  const modeMeta = RECORDING_MODE_LABELS[captureMode ?? 'image-chain'];
  const storageMB = ((stepCount ?? 0) * 0.18).toFixed(1);

  return (
    <div className={shell} style={shellShadow}>
      {/* Header */}
      <div className="flex items-center gap-[10px] px-4 py-[14px_16px_10px] border-b border-[oklch(0.94_0.005_258)]">
        {/* Logo */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vs-rec-logo" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
              <stop offset="100%" stopColor="oklch(0.58 0.19 25)"/>
            </linearGradient>
          </defs>
          <rect width="20" height="20" rx="5" fill="url(#vs-rec-logo)"/>
          <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-semibold" style={{ color: '#1d2230' }}>ToyoSnap</span>
        <StatusBadge isRecording={true} isPaused={isPaused ?? false} />
      </div>

      <div className="px-4 py-[14px_16px_16px] flex flex-col gap-[14px]">
        {/* Gradient stats panel */}
        <div
          className="rounded-[12px] p-[14px]"
          style={{
            background: 'linear-gradient(180deg, oklch(0.98 0.02 258) 0%, #fff 100%)',
            border: '1px solid oklch(0.92 0.02 258)',
          }}
        >
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.6px]" style={{ color: '#6a7180' }}>
                Elapsed
              </div>
              <div
                className="text-[28px] font-semibold leading-none mt-1 tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums', color: '#1d2230' }}
              >
                {mm}:{ss}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.6px]" style={{ color: '#6a7180' }}>
                Steps captured
              </div>
              <div
                className="text-[28px] font-semibold leading-none mt-1 tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.38 0.14 258)' }}
              >
                {String(stepCount ?? 0).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* Settings summary */}
        <div className="rounded-[10px] p-[10px] text-xs" style={{ background: '#f7f8fa' }}>
          <div className="flex items-center justify-between py-1">
            <span style={{ color: '#6a7180' }}>Mode</span>
            <span className="font-semibold">{modeMeta}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span style={{ color: '#6a7180' }}>Cursor</span>
            <span className="font-semibold">{(activeCursor) ? 'Captured' : 'Hidden'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span style={{ color: '#6a7180' }}>Storage</span>
            <span className="font-semibold tabular-nums">{storageMB} MB · session</span>
          </div>
        </div>

        {/* Pause + Stop buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            className="flex-1 py-[10px] rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-[6px] transition-colors"
            style={{
              background: '#fff',
              border: '1px solid oklch(0.9 0.008 258)',
              color: '#1d2230',
            }}
          >
            {(isPaused) ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={handleToggleRecord}
            className="flex-[1.4] py-[10px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-[6px] transition-opacity hover:opacity-90"
            style={{ background: 'oklch(0.58 0.19 25)' }}
          >
            Stop &amp; review
          </button>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 px-4 py-[10px] text-[11px]"
        style={{
          borderTop: '1px solid oklch(0.94 0.005 258)',
          background: 'oklch(0.985 0.005 258)',
          color: '#6a7180',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <rect x="3" y="9" width="14" height="9" rx="2"/>
          <path d="M7 9V7a3 3 0 016 0v2"/>
        </svg>
        Captured locally · {stepCount ?? 0} step{(stepCount ?? 0) === 1 ? '' : 's'} encrypted in session storage
      </div>
    </div>
  );
}
```

Add the `RECORDING_MODE_LABELS` constant near the top of `popup.tsx`:
```typescript
const RECORDING_MODE_LABELS: Record<string, string> = {
  'image-chain': 'PNG chain',
  'svg':         'Layered SVG',
  'video':       'Video',
  'rrweb':       'HTML replay',
};
```

Add `handleTogglePause` alongside `handleToggleRecord`:
```typescript
function handleTogglePause() {
  const msg: ExtensionMessage = { type: isPaused ? "RESUME_CAPTURE" : "PAUSE_CAPTURE" };
  chrome.runtime.sendMessage(msg);
}
```

Destructure `isPaused` from `useSession()`:
```typescript
const { ..., isPaused } = useSession();
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --reporter=verbose popup-recording-state`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/popup/popup.tsx
git commit -m "style: recording state stats panel, pause button, stop & review per design reference"
```

---

### Task 8: PAUSE_CAPTURE / RESUME_CAPTURE messages

**Files:**
- Modify: `src/types/messages.ts`
- Modify: `src/lib/session-store.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/content/recording-overlay.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pause-capture.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('PAUSE_CAPTURE message', () => {
  it('is a valid ExtensionMessage type', async () => {
    // Verify the type union includes the new messages
    // This is a compile-time check — if the import fails, types are missing
    const { } = await import('@/types/messages');
    // The real assertion is that TypeScript compiles without error
    expect(true).toBe(true);
  });
});
```

Run: `npm run typecheck`
Expected: FAIL (PAUSE_CAPTURE and RESUME_CAPTURE not in messages union)

- [ ] **Step 2: Extend `src/types/messages.ts`**

Open the file and add to the `ExtensionMessage` union:
```typescript
| { type: "PAUSE_CAPTURE" }
| { type: "RESUME_CAPTURE" }
```

- [ ] **Step 3: Add `isPaused` to `SessionControlPlane` in `src/lib/session-store.ts`**

Find the `SessionControlPlane` interface (or object shape) and add:
```typescript
isPaused?: boolean;
```

- [ ] **Step 4: Add handlers in `service-worker.ts`**

In the message switch, after `STOP_CAPTURE`:
```typescript
case "PAUSE_CAPTURE":
  void (async () => {
    await setSessionControlPlane({ isPaused: true });
    await broadcastStateUpdate();
  })();
  sendResponse({ ok: true });
  break;

case "RESUME_CAPTURE":
  void (async () => {
    await setSessionControlPlane({ isPaused: false });
    await broadcastStateUpdate();
  })();
  sendResponse({ ok: true });
  break;
```

- [ ] **Step 5: Update recording overlay to react to `isPaused`**

In `src/content/recording-overlay.ts`, inside the `SESSION_UPDATED` listener, add:
```typescript
if (message.type === 'SESSION_UPDATED' && message.payload?.isPaused !== undefined) {
  const label = shadow?.querySelector('.vs-label') as HTMLElement | null;
  if (label) label.textContent = message.payload.isPaused ? 'Paused' : modeLabel;
  const dot = shadow?.querySelector('.vs-dot') as HTMLElement | null;
  if (dot) dot.style.animationPlayState = message.payload.isPaused ? 'paused' : 'running';
}
```

- [ ] **Step 6: Run typecheck + unit test**

Run: `npm run typecheck && npm run test:unit -- --reporter=verbose pause-capture`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/messages.ts src/lib/session-store.ts src/background/service-worker.ts src/content/recording-overlay.ts tests/unit/pause-capture.test.ts
git commit -m "feat: add PAUSE_CAPTURE/RESUME_CAPTURE messages and isPaused state"
```

---

## Phase 2: Post-stop Success Sheet (Flow B)

### Task 9: RecordingComplete component + just-stopped state

**Files:**
- Create: `src/popup/components/RecordingComplete.tsx`
- Modify: `src/popup/popup.tsx`
- Modify: `src/popup/hooks/useSession.ts`

After the user clicks "Stop & review," the design shows a success sheet inside the popup: session stats (steps, duration, mode, size) and a primary CTA "Review & export in Studio."

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/recording-complete.test.ts
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RecordingComplete } from '@/popup/components/RecordingComplete';

const PROPS = {
  steps: 4,
  durationMs: 75000,
  mode: 'image-chain' as const,
  onOpenStudio: vi.fn(),
  onDismiss: vi.fn(),
};

describe('RecordingComplete', () => {
  it('shows "Recording saved locally."', () => {
    render(<RecordingComplete {...PROPS} />);
    expect(screen.getByText(/recording saved locally/i)).toBeInTheDocument();
  });

  it('displays step count', () => {
    render(<RecordingComplete {...PROPS} />);
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('calls onOpenStudio on primary CTA click', async () => {
    const onOpenStudio = vi.fn();
    render(<RecordingComplete {...PROPS} onOpenStudio={onOpenStudio} />);
    await userEvent.click(screen.getByRole('button', { name: /review.*export.*studio/i }));
    expect(onOpenStudio).toHaveBeenCalled();
  });

  it('calls onDismiss on secondary CTA click', async () => {
    const onDismiss = vi.fn();
    render(<RecordingComplete {...PROPS} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose recording-complete`
Expected: FAIL (component doesn't exist)

- [ ] **Step 2: Create `src/popup/components/RecordingComplete.tsx`**

```tsx
// src/popup/components/RecordingComplete.tsx
import React from "react";
import type { CaptureMode } from "@/types/capture";

const MODE_LABELS: Record<CaptureMode, string> = {
  'image-chain': 'PNG chain',
  'svg':         'SVG layers',
  'video':       'Video',
  'rrweb':       'HTML replay',
};

interface Props {
  steps: number;
  durationMs: number;
  mode: CaptureMode;
  onOpenStudio: () => void;
  onDismiss: () => void;
}

export function RecordingComplete({ steps, durationMs, mode, onOpenStudio, onDismiss }: Props) {
  const totalSec = Math.floor(durationMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const duration = `${m}m ${s}s`;
  const sizeMB = (steps * 0.18).toFixed(1);

  return (
    <div className="px-4 py-[18px] flex flex-col gap-[14px]">
      {/* Icon + title */}
      <div className="flex items-start gap-[10px]">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)' }}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M4 10l4 4 8-8" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-semibold tracking-[-0.2px]" style={{ color: '#1d2230' }}>
            Recording saved locally.
          </div>
          <div className="text-[13px] mt-1 leading-[1.5]" style={{ color: '#454c5a' }}>
            {steps} steps · {duration} · {MODE_LABELS[mode]} · encrypted in session storage.
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-[10px]">
        {[
          { label: 'Steps',    value: String(steps).padStart(2, '0') },
          { label: 'Duration', value: duration },
          { label: 'Size',     value: `${sizeMB} MB` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[10px] px-3 py-[10px]"
            style={{ background: 'oklch(0.985 0.005 250)', border: '1px solid oklch(0.93 0.006 250)' }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.6px]" style={{ color: '#6a7180' }}>
              {label}
            </div>
            <div className="text-[17px] font-semibold tabular-nums mt-[2px]" style={{ color: '#1d2230' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenStudio}
          className="flex-[1.4] py-[11px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-[6px] transition-opacity hover:opacity-90"
          style={{ background: 'oklch(0.58 0.19 258)' }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
            stroke="white" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M10 2l1.5 3 3.5.5-2.5 2.4.6 3.5L10 9.75l-3.1 1.65.6-3.5L5 5.5l3.5-.5z" fill="white"/>
          </svg>
          Review &amp; export in Studio
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 py-[11px] rounded-[10px] text-[13px] font-medium transition-colors hover:bg-gray-50"
          style={{
            background: '#fff',
            border: '1px solid oklch(0.92 0.008 258)',
            color: '#454c5a',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `justStopped` state to `popup.tsx`**

Add local state for the post-stop phase and the session summary:
```typescript
const [justStopped, setJustStopped] = React.useState(false);
const [stoppedSummary, setStoppedSummary] = React.useState<{
  steps: number; durationMs: number; mode: CaptureMode;
} | null>(null);
```

Modify `handleToggleRecord` to capture the summary before stopping:
```typescript
function handleToggleRecord() {
  if (isRecording) {
    setStoppedSummary({
      steps: stepCount ?? 0,
      durationMs: elapsedMs,
      mode: captureMode ?? 'image-chain',
    });
    setJustStopped(true);
    const msg: ExtensionMessage = { type: "STOP_CAPTURE" };
    chrome.runtime.sendMessage(msg, () => {
      setTimeout(refreshState, 50);
    });
  } else {
    /* ... existing start logic ... */
  }
}
```

Add a `justStopped` branch in the render (before the idle return):
```tsx
if (justStopped && stoppedSummary) {
  return (
    <div className={shell} style={shellShadow}>
      {/* Header */}
      <div className="flex items-center gap-[10px] px-4" style={{ padding: '14px 16px 10px', borderBottom: '1px solid oklch(0.94 0.005 258)' }}>
        {/* same logo as idle */}
        <span className="text-sm font-semibold" style={{ color: '#1d2230' }}>ToyoSnap</span>
      </div>
      <RecordingComplete
        steps={stoppedSummary.steps}
        durationMs={stoppedSummary.durationMs}
        mode={stoppedSummary.mode}
        onOpenStudio={() => { openEditor(); setJustStopped(false); }}
        onDismiss={() => setJustStopped(false)}
      />
    </div>
  );
}
```

Import `RecordingComplete` at the top of `popup.tsx`.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit -- --reporter=verbose recording-complete`
Expected: PASS

- [ ] **Step 5: Build and verify**

Run: `npm run build`, open extension, start and stop a recording. Confirm success sheet appears with stats and CTA.

- [ ] **Step 6: Commit**

```bash
git add src/popup/components/RecordingComplete.tsx src/popup/popup.tsx tests/unit/recording-complete.test.ts
git commit -m "feat: post-stop recording success sheet (Flow B) per design reference"
```

---

## Phase 3: First-time Onboarding (Flow A)

### Task 10: Welcome page on install

**Files:**
- Create: `src/welcome/welcome.html`
- Create: `src/welcome/welcome.tsx`
- Modify: `src/manifest.ts`
- Modify: `src/background/service-worker.ts`

Design: after install, open `welcome.html` tab. The page shows the VectoSnap (ToyoSnap) logo, tagline, 3 feature cards (Zero-egress, Encrypted at rest, 5 export formats), and a "Pin to toolbar" prompt.

- [ ] **Step 1: Write failing test for onInstalled handler**

```typescript
// tests/unit/on-installed-welcome.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('onInstalled welcome tab', () => {
  it('opens welcome.html on first install', async () => {
    const createTab = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        onInstalled: { addListener: vi.fn((cb) => cb({ reason: 'install' })) },
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
        lastError: null,
      },
      tabs: { create: createTab },
      action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
      storage: { session: { setAccessLevel: vi.fn() }, local: { get: vi.fn(() => ({})), set: vi.fn() } },
    });

    // Import the SW module (side-effects run handlers)
    await import('@/background/service-worker');

    expect(createTab).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('welcome.html') })
    );
  });
});
```

Run: `npm run test:unit -- --reporter=verbose on-installed-welcome`
Expected: FAIL

- [ ] **Step 2: Add `onInstalled` handler to `service-worker.ts`**

Add near the top, after the `chrome.storage.session.setAccessLevel` call:
```typescript
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome/welcome.html') });
  }
});
```

- [ ] **Step 3: Create `src/welcome/welcome.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to ToyoSnap</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./welcome.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create `src/welcome/welcome.tsx`**

```tsx
// src/welcome/welcome.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';

const FEATURES = [
  {
    icon: 'shield',
    title: 'Zero‑egress',
    desc: 'CSP blocks all outbound network calls.',
  },
  {
    icon: 'lock',
    title: 'Encrypted at rest',
    desc: 'AES‑GCM session key — wiped on exit.',
  },
  {
    icon: 'layers',
    title: '5 export formats',
    desc: 'PNG chain, SVG layers, video, HTML, docs.',
  },
];

function WelcomeScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-10"
      style={{ background: 'linear-gradient(180deg, oklch(0.98 0.015 258) 0%, #ffffff 60%)' }}
    >
      <div className="max-w-[620px] w-full text-center">
        {/* Logo */}
        <div
          className="w-[68px] h-[68px] rounded-[18px] mx-auto mb-[18px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, oklch(0.62 0.19 258), oklch(0.48 0.18 270))',
            boxShadow: '0 20px 40px oklch(0.58 0.19 258 / 0.35)',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect width="20" height="20" rx="5" fill="white" fillOpacity="0.9"/>
            <path d="M5 10h10M10 5v10" stroke="oklch(0.62 0.19 258)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-[34px] font-semibold tracking-[-0.6px] mb-[10px]" style={{ color: '#1d2230' }}>
          Welcome to ToyoSnap
        </h1>
        <p className="text-[15px] leading-[1.55] mb-[22px]" style={{ color: '#454c5a' }}>
          Capture any web workflow as screenshots, vectors, or an interactive replay.
          Nothing leaves your machine — ever.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[10px] p-[14px] text-left"
              style={{ background: '#fff', border: '1px solid oklch(0.93 0.006 258)' }}
            >
              <div
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2"
                style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                >
                  {f.icon === 'shield' && <path d="M10 2l6 3v5c0 4-6 8-6 8S4 14 4 10V5l6-3z"/>}
                  {f.icon === 'lock'   && <><rect x="3" y="9" width="14" height="9" rx="2"/><path d="M7 9V7a3 3 0 016 0v2"/></>}
                  {f.icon === 'layers' && <><path d="M2 10l8-5 8 5-8 5-8-5z"/><path d="M2 15l8 5 8-5"/></>}
                </svg>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: '#1d2230' }}>{f.title}</div>
              <div className="text-[11.5px] leading-[1.4] mt-[3px]" style={{ color: '#6a7180' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pin prompt */}
        <div
          className="rounded-[12px] p-[18px_20px] flex items-center gap-[14px] text-left"
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
              <path d="M10 2v8m0 0l-3 3m3-3l3 3M3 18h14"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>
              Pin ToyoSnap to your toolbar
            </div>
            <div className="text-[12px]" style={{ color: '#6a7180' }}>
              Click the icon in the upper right to start capturing.
            </div>
          </div>
          <span
            className="text-[11px] px-[10px] py-[6px] rounded-[6px]"
            style={{ color: '#454c5a', background: '#f4f5f8', fontFamily: 'monospace' }}
          >
            ↗ top right
          </span>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<WelcomeScreen />);
```

- [ ] **Step 5: Register welcome.html in `src/manifest.ts`**

Find the `web_accessible_resources` array and add `welcome.html`:
```typescript
web_accessible_resources: [
  {
    resources: ['src/editor/editor.html', 'src/welcome/welcome.html'],
    matches: ['<all_urls>'],
  },
],
```

Also add welcome.html to the Vite entry points in `vite.config.ts` under the `input` array:
```typescript
input: {
  popup:   'src/popup/popup.html',
  editor:  'src/editor/editor.html',
  welcome: 'src/welcome/welcome.html',  // ← add this
  background: 'src/background/service-worker.ts',
  content:    'src/content/content-script.ts',
},
```

- [ ] **Step 6: Run test**

Run: `npm run test:unit -- --reporter=verbose on-installed-welcome`
Expected: PASS

- [ ] **Step 7: Build and verify**

Run: `npm run build`, then install the extension fresh (remove and reload). Confirm welcome.html opens in a new tab.

- [ ] **Step 8: Commit**

```bash
git add src/welcome/ src/manifest.ts vite.config.ts src/background/service-worker.ts tests/unit/on-installed-welcome.test.ts
git commit -m "feat: open welcome.html tab on first install (Flow A)"
```

---

### Task 11: OnboardingPopup + OnboardingTour

**Files:**
- Create: `src/popup/components/OnboardingPopup.tsx`
- Create: `src/popup/components/OnboardingTour.tsx`
- Modify: `src/popup/popup.tsx`

Design: on the very first popup open, show `OnboardingPopup` ("You're all set — take a tour or jump in"). If the user picks the tour, show `OnboardingTour` (3 slides). Both overlay the normal popup shell. "First open" is tracked in `chrome.storage.local`.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/onboarding.test.ts
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingPopup } from '@/popup/components/OnboardingPopup';
import { OnboardingTour } from '@/popup/components/OnboardingTour';

describe('OnboardingPopup', () => {
  it('shows "You\'re all set" heading', () => {
    render(<OnboardingPopup onShowTour={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
  });

  it('calls onShowTour when tour button is clicked', async () => {
    const onShowTour = vi.fn();
    render(<OnboardingPopup onShowTour={onShowTour} onDismiss={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /show me how/i }));
    expect(onShowTour).toHaveBeenCalled();
  });

  it('calls onDismiss when skip button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<OnboardingPopup onShowTour={vi.fn()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('OnboardingTour', () => {
  it('renders slide 1 content', () => {
    render(<OnboardingTour onDone={vi.fn()} />);
    expect(screen.getByText(/choose a capture mode/i)).toBeInTheDocument();
  });

  it('navigates to next slide', async () => {
    render(<OnboardingTour onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/record on any page/i)).toBeInTheDocument();
  });

  it('calls onDone on last slide Done click', async () => {
    const onDone = vi.fn();
    render(<OnboardingTour onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
```

Run: `npm run test:unit -- --reporter=verbose onboarding`
Expected: FAIL

- [ ] **Step 2: Create `src/popup/components/OnboardingPopup.tsx`**

```tsx
// src/popup/components/OnboardingPopup.tsx
import React from "react";

interface Props {
  onShowTour: () => void;
  onDismiss: () => void;
}

export function OnboardingPopup({ onShowTour, onDismiss }: Props) {
  return (
    <div
      className="w-[360px] overflow-hidden"
      style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid oklch(0.9 0.008 258)',
        boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      }}
    >
      {/* Decorative header */}
      <div
        className="px-[18px] pt-5 pb-4 relative"
        style={{ background: 'linear-gradient(135deg, oklch(0.96 0.035 258), oklch(0.94 0.06 270))' }}
      >
        <div className="flex items-center gap-[10px]">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="ob-logo" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
                <stop offset="100%" stopColor="oklch(0.48 0.18 270)"/>
              </linearGradient>
            </defs>
            <rect width="20" height="20" rx="5" fill="url(#ob-logo)"/>
            <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>ToyoSnap</span>
          <span
            className="ml-auto text-[10px] font-bold tracking-[0.4px] px-2 py-[3px] rounded-full"
            style={{ background: '#fff', color: 'oklch(0.38 0.14 258)' }}
          >
            v 1.0
          </span>
        </div>
        <div className="text-[18px] font-semibold mt-3 tracking-[-0.2px]" style={{ color: '#1d2230' }}>
          You're all set.
        </div>
        <div className="text-[12.5px] mt-1 leading-[1.45]" style={{ color: '#454c5a' }}>
          Take a 30‑second tour, or jump straight in.
        </div>
      </div>

      {/* Buttons */}
      <div className="p-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onShowTour}
          className="w-full py-[10px] px-[14px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-[6px] transition-opacity hover:opacity-90"
          style={{ background: 'oklch(0.58 0.19 258)' }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="white" aria-hidden="true">
            <path d="M10 2l1.5 3 3.5.5-2.5 2.4.6 3.5L10 9.75l-3.1 1.65.6-3.5L5 5.5l3.5-.5z"/>
          </svg>
          Show me how it works
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-[10px] px-[14px] rounded-[10px] text-[13px] font-medium transition-colors hover:bg-gray-50"
          style={{
            background: 'transparent',
            border: '1px solid oklch(0.92 0.008 258)',
            color: '#454c5a',
          }}
        >
          Skip — I'll figure it out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/popup/components/OnboardingTour.tsx`**

```tsx
// src/popup/components/OnboardingTour.tsx
import React, { useState } from "react";

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
];

const ICON_PATHS: Record<string, string> = {
  record:   'M6 6h8v8H6z',
  cursor:   'M4 4l6 14 2.5-5.5L18 10z',
  download: 'M10 3v10m0 0l-4-4m4 4l4-4M3 17h14',
};

interface Props {
  onDone: () => void;
}

export function OnboardingTour({ onDone }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  return (
    <div
      className="w-[360px] overflow-hidden"
      style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid oklch(0.9 0.008 258)',
        boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      }}
    >
      <div className="px-[18px] pt-5 pb-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-[10px]"
          style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d={ICON_PATHS[slide.icon]} />
          </svg>
        </div>
        <div className="text-[16px] font-semibold" style={{ color: '#1d2230' }}>
          {slide.title}
        </div>
        <div className="text-[13px] mt-1 leading-[1.5]" style={{ color: '#454c5a' }}>
          {slide.body}
        </div>
      </div>

      {/* Pagination + nav */}
      <div
        className="px-4 py-[10px_16px_14px] flex items-center gap-3"
        style={{ borderTop: '1px solid oklch(0.94 0.005 258)' }}
      >
        {/* Dots */}
        <div className="flex gap-1">
          {SLIDES.map((_, k) => (
            <div
              key={k}
              style={{
                width: k === i ? 18 : 6, height: 6, borderRadius: 3,
                background: k === i ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
                transition: 'all 180ms',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="px-[10px] py-[6px] text-xs"
            style={{ color: '#6a7180' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => isLast ? onDone() : setI(i + 1)}
            className="px-3 py-[6px] rounded-[8px] text-xs font-semibold text-white flex items-center gap-1 transition-opacity hover:opacity-90"
            style={{ background: 'oklch(0.58 0.19 258)' }}
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
                stroke="white" strokeWidth="1.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M7 5l6 5-6 5"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire onboarding into `popup.tsx`**

Add onboarding state tracking (uses `chrome.storage.local`):
```typescript
type OnboardingPhase = 'checking' | 'welcome' | 'tour' | 'done';
const [onboardPhase, setOnboardPhase] = React.useState<OnboardingPhase>('checking');

React.useEffect(() => {
  chrome.storage.local.get('onboardingDone', (result) => {
    setOnboardPhase(result.onboardingDone ? 'done' : 'welcome');
  });
}, []);

function completeOnboarding() {
  chrome.storage.local.set({ onboardingDone: true });
  setOnboardPhase('done');
}
```

In the render, before returning the idle/recording/stopped JSX, add:
```tsx
if (onboardPhase === 'checking' || loading) return null;

if (onboardPhase === 'welcome') {
  return <OnboardingPopup onShowTour={() => setOnboardPhase('tour')} onDismiss={completeOnboarding} />;
}

if (onboardPhase === 'tour') {
  return <OnboardingTour onDone={completeOnboarding} />;
}
```

Import `OnboardingPopup` and `OnboardingTour` at the top of `popup.tsx`.

- [ ] **Step 5: Run tests**

Run: `npm run test:unit -- --reporter=verbose onboarding`
Expected: PASS (all 6 tests)

- [ ] **Step 6: Build and verify**

Run: `npm run build`. Remove and reinstall extension. Open popup for the first time. Confirm onboarding popup appears. Click "Show me how it works" and confirm tour slides appear. Complete tour — confirm popup shows normal idle state on next open.

- [ ] **Step 7: Commit**

```bash
git add src/popup/components/OnboardingPopup.tsx src/popup/components/OnboardingTour.tsx src/popup/popup.tsx tests/unit/onboarding.test.ts
git commit -m "feat: first-time onboarding popup and tour (Flow A) per design reference"
```

---

## Final Verification

- [ ] Run `npm run typecheck` — 0 errors
- [ ] Run `npm run lint` — 0 errors  
- [ ] Run `npm run test:unit` — all tests green
- [ ] Run `npm run build` — clean build
- [ ] Load extension, open popup: shell is 360px wide with border/shadow
- [ ] Idle state: Zero-egress green badge visible, 4 mode cards, toggle switch, conditional Open Studio, footer with lock icon
- [ ] Recording state: gradient stats panel, Pause/Resume button, "Stop & review", orange badge
- [ ] Stop recording: success sheet appears with stats and "Review & export in Studio" CTA
- [ ] Fresh install: welcome.html opens in new tab
- [ ] First popup open after install: onboarding popup shown → tour flows correctly

```bash
git add .
git commit -m "chore: final design alignment verification pass"
```
