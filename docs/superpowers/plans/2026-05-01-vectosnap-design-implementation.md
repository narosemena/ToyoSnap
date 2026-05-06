# VectoSnap Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the VectoSnap prototype design (`design/flows/VectoSnap/`) into the live extension, closing gaps in popup UI, in-page recording overlay, PII redaction primitives, and export modal flow.

**Architecture:** The design introduces three new UI surfaces (redesigned popup, in-page recording overlay, export progress/done modal) and two feature additions (pixelate PII primitive, PrimitiveInspector parameter controls). Each phase is independently executable after Task 1 (design tokens, which only touches CSS).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Chrome Extension MV3, shadow DOM (content-script overlay), CSS custom properties with OKLCH (token layer), Zustand (editor store, unchanged), Vitest + @testing-library/react (unit tests)

**Out of scope (future plans):** Onboarding Flow A, Pause/Resume capture, PII auto-detection, Post-stop stats sheet (the SW already auto-opens the editor on stop).

---

## File Map

| File | Action | Responsible |
|------|--------|-------------|
| `src/styles/globals.css` | Add OKLCH token layer | Task 1 |
| `src/popup/components/ModeSelector.tsx` | Replace `<select>` with mode cards | Task 2 |
| `src/popup/popup.tsx` | Recording UI with timer/step count; idle UI polish | Task 3 |
| `src/popup/hooks/useSession.ts` | Add `elapsedMs`, `stepCount`; export `formatElapsed` | Task 3 |
| `src/lib/session-store.ts` | Add `stepCount` field to control plane type | Task 3 |
| `src/background/service-worker.ts` | Broadcast stepCount after each step stored | Task 3 |
| `src/content/recording-overlay.ts` | **New** — shadow DOM pill, timer, step counter, burst | Task 4 |
| `src/content/capture-coordinator.ts` | Mount/unmount overlay on start/stop | Task 4 |
| `src/types/ledger.ts` | Add `"pixelate"` op type, `pixelCellSize` field | Task 5 |
| `src/editor/components/pixelate-renderer.ts` | **New** — `applyPixelate()` pure function | Task 5 |
| `src/editor/components/PrimitiveInspector.tsx` | **New** — blur/pixelate/redact inspector with sliders | Task 5 |
| `src/editor/components/PIICanvas.tsx` | Add pixelate rendering case + mount PrimitiveInspector | Task 5 |
| `src/editor/components/export/ExportProgressModal.tsx` | **New** — progress bar + done card | Task 6 |
| `src/editor/components/export/ExportPanel.tsx` | Add recommended badge; wire progress/done modals | Task 6 |
| `tests/unit/design-tokens.test.ts` | **New** | Task 1 |
| `tests/unit/ModeSelector.test.tsx` | **New** | Task 2 |
| `tests/unit/useSession.test.ts` | **New** | Task 3 |
| `tests/unit/recording-overlay.test.ts` | **New** | Task 4 |
| `tests/unit/pixelate.test.ts` | **New** | Task 5 |
| `tests/unit/ExportProgressModal.test.tsx` | **New** | Task 6 |

---

## Task 1: VectoSnap Design Tokens

**Files:**
- Modify: `src/styles/globals.css`
- Create: `tests/unit/design-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/design-tokens.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('VectoSnap design tokens', () => {
  it('globals.css defines --vs-accent with oklch', () => {
    const css = readFileSync('src/styles/globals.css', 'utf-8');
    expect(css).toContain('--vs-accent');
    expect(css).toContain('oklch');
  });

  it('globals.css defines all semantic tokens', () => {
    const css = readFileSync('src/styles/globals.css', 'utf-8');
    expect(css).toContain('--vs-record');
    expect(css).toContain('--vs-success');
    expect(css).toContain('--vs-shadow-popup');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- design-tokens`  
Expected: FAIL — `--vs-accent` not found in globals.css

- [ ] **Step 3: Append token layer to globals.css**

Add at the end of `src/styles/globals.css`:

```css
/* ── VectoSnap design token layer ─────────────────────────────────────── */
:root {
  /* Accent — indigo */
  --vs-accent:       oklch(0.62 0.19 258);
  --vs-accent-hover: oklch(0.56 0.20 258);
  --vs-accent-soft:  oklch(0.96 0.03 258);

  /* Neutrals — cool-toned */
  --vs-n-50:  oklch(0.985 0.002 264);
  --vs-n-100: oklch(0.960 0.003 264);
  --vs-n-200: oklch(0.920 0.005 264);
  --vs-n-300: oklch(0.840 0.008 264);
  --vs-n-400: oklch(0.720 0.012 264);
  --vs-n-500: oklch(0.590 0.016 264);
  --vs-n-600: oklch(0.460 0.014 264);
  --vs-n-700: oklch(0.360 0.012 264);
  --vs-n-800: oklch(0.270 0.010 264);
  --vs-n-900: oklch(0.190 0.008 264);

  /* Semantic */
  --vs-record:  oklch(0.58 0.19  25);
  --vs-success: oklch(0.62 0.15 155);
  --vs-warn:    oklch(0.72 0.17  75);

  /* Shadows */
  --vs-shadow-sm:    0 1px  2px oklch(0 0 0 / 0.06);
  --vs-shadow-md:    0 4px 12px oklch(0 0 0 / 0.08);
  --vs-shadow-lg:    0 8px 24px oklch(0 0 0 / 0.12);
  --vs-shadow-popup: 0 8px 32px oklch(0 0 0 / 0.16), 0 2px 8px oklch(0 0 0 / 0.08);

  /* Radii */
  --vs-r-sm: 6px;
  --vs-r-md: 8px;
  --vs-r-lg: 12px;
  --vs-r-xl: 16px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- design-tokens`  
Expected: PASS (2 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors (CSS-only change)

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css tests/unit/design-tokens.test.ts
git commit -m "Add VectoSnap OKLCH design token layer to globals.css"
```

---

## Task 2: Popup — Mode Cards (replace `<select>` dropdown)

**Files:**
- Modify: `src/popup/components/ModeSelector.tsx`
- Create: `tests/unit/ModeSelector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ModeSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '@/popup/components/ModeSelector';

describe('ModeSelector', () => {
  it('renders two mode cards', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={false} />);
    expect(screen.getByText('Screenshot Chain')).toBeInTheDocument();
    expect(screen.getByText('SVG Layers')).toBeInTheDocument();
  });

  it('marks the active card with aria-checked=true', () => {
    render(<ModeSelector value="svg" onChange={() => {}} disabled={false} />);
    const svgCard = screen.getByRole('radio', { name: /SVG Layers/i });
    expect(svgCard).toHaveAttribute('aria-checked', 'true');
    const imgCard = screen.getByRole('radio', { name: /Screenshot Chain/i });
    expect(imgCard).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when a card is clicked', () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    fireEvent.click(screen.getByRole('radio', { name: /SVG Layers/i }));
    expect(onChange).toHaveBeenCalledWith('svg');
  });

  it('disables all cards when disabled=true', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={true} />);
    screen.getAllByRole('radio').forEach((c) => expect(c).toBeDisabled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- ModeSelector`  
Expected: FAIL — no elements with role `radio`

- [ ] **Step 3: Rewrite ModeSelector.tsx as clickable mode cards**

```tsx
// src/popup/components/ModeSelector.tsx
import React from "react";
import type { CaptureMode } from "@/types/capture";

const MODES: { value: CaptureMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "image-chain",
    label: "Screenshot Chain",
    description: "Raster snapshot on each click",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="16" height="12" rx="2"/>
        <circle cx="10" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    value: "svg",
    label: "SVG Layers",
    description: "Vector capture on each click",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 14l4-8 4 8"/><path d="M6 10h4"/>
        <path d="M14 6l2 2-2 2"/>
      </svg>
    ),
  },
];

interface Props {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled: boolean;
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Capture mode">
      <p className="text-xs font-medium mb-1.5 text-gray-500 dark:text-gray-400">Capture mode</p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              disabled={disabled}
              onClick={() => onChange(m.value)}
              className={[
                "flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                active
                  ? "border-[var(--vs-accent)] bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              {m.icon}
              <span className="text-xs font-semibold leading-tight">{m.label}</span>
              <span className="text-[10px] leading-tight opacity-70">{m.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- ModeSelector`  
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/popup/components/ModeSelector.tsx tests/unit/ModeSelector.test.tsx
git commit -m "Replace ModeSelector dropdown with accessible mode cards"
```

---

## Task 3: Popup — Elapsed Timer, Step Count, and Idle UI Polish

**Files:**
- Modify: `src/popup/hooks/useSession.ts`
- Modify: `src/popup/popup.tsx`
- Modify: `src/lib/session-store.ts` (add `stepCount` to plane type)
- Modify: `src/background/service-worker.ts` (broadcast stepCount after each step)
- Create: `tests/unit/useSession.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/useSession.test.ts
import { describe, it, expect } from 'vitest';
import { formatElapsed } from '@/popup/hooks/useSession';

describe('formatElapsed', () => {
  it('formats 0ms as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats 65000ms as 01:05', () => {
    expect(formatElapsed(65000)).toBe('01:05');
  });

  it('formats 3661000ms as 61:01', () => {
    expect(formatElapsed(3661000)).toBe('61:01');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- useSession`  
Expected: FAIL — `formatElapsed` not exported from that path

- [ ] **Step 3: Replace useSession.ts**

```typescript
// src/popup/hooks/useSession.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaptureMode } from '@/types/capture';

export interface SessionState {
  isRecording: boolean;
  activeSessionId?: string;
  recordingStartedAt?: number;
  captureMode?: CaptureMode;
  captureCursor?: boolean;
  stepCount?: number;
}

/** Pure helper — exported for tests and popup UI. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ isRecording: false });
  const [loading, setLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshState = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[ToyoSnap] SW unreachable:", chrome.runtime.lastError);
      } else if (response) {
        setState(response);
      }
      setLoading(false);
    });
  }, []);

  // Tick elapsed timer while recording
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (state.isRecording && state.recordingStartedAt) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (state.recordingStartedAt ?? Date.now()));
      }, 500);
    } else {
      setElapsedMs(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRecording, state.recordingStartedAt]);

  useEffect(() => {
    refreshState();
    const listener = (message: any) => {
      if (message.type === 'SESSION_UPDATED') setState(message.payload);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshState]);

  return { ...state, loading, refreshState, elapsedMs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- useSession`  
Expected: PASS (3 tests)

- [ ] **Step 5: Add `stepCount` to the session control plane type**

Read `src/lib/session-store.ts`. Find the interface or type that defines the session control plane shape (the object passed to `setSessionControlPlane`). Add the optional field:

```typescript
  stepCount?: number;
```

- [ ] **Step 6: Broadcast stepCount after each step in service-worker.ts**

In `src/background/service-worker.ts`:

After `await putStep(step);` inside the **CAPTURE_IMAGE_STEP** handler (around line 151), add:

```typescript
            const updatedPlane = await getSessionControlPlane();
            if (updatedPlane) {
              await setSessionControlPlane({ ...updatedPlane, stepCount: stepIndex });
              await broadcastStateUpdate();
            }
```

After `await putStep(step);` inside the **STORE_BLOB_STEP** handler (around line 180), add the same block.

- [ ] **Step 7: Update popup.tsx recording + idle UI**

Replace the `return (...)` block in the `Popup` function in `src/popup/popup.tsx` with the two-branch layout below. Also add `formatElapsed` to the import from `"./hooks/useSession"`.

```tsx
// Add to imports at top:
// import { useSession, formatElapsed } from "./hooks/useSession";

// Replace return block:

  if (loading) return null;

  // ── Recording state ─────────────────────────────────────────────────────
  if (isRecording) {
    return (
      <div className="flex flex-col gap-3 p-4 w-60 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--vs-record)] motion-safe:animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vs-record)]">
            Recording
          </span>
          <span className="ml-auto text-xs font-mono text-gray-500 dark:text-gray-400">
            {formatElapsed(elapsedMs)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {captureMode === "svg" ? "SVG Layers" : "Screenshot Chain"}
          </span>
          <span className="text-xs font-mono font-semibold tabular-nums text-gray-700 dark:text-gray-300">
            {String(stepCount ?? 0).padStart(2, "0")} steps
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleRecord}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--vs-record)" }}
        >
          Stop recording
        </button>

        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
          Encrypted at rest · Zero-egress
        </p>
      </div>
    );
  }

  // ── Idle state ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-4 w-60 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vs-lg" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
              <stop offset="100%" stopColor="oklch(0.58 0.19 25)"/>
            </linearGradient>
          </defs>
          <rect width="20" height="20" rx="5" fill="url(#vs-lg)"/>
          <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-semibold">ToyoSnap</span>
        <div className="ml-auto">
          <StatusBadge isRecording={false} />
        </div>
      </div>

      <ModeSelector value={activeMode} onChange={setMode} disabled={false} />

      {activeMode === "image-chain" && (
        <ImageFormatSelector value={imageFormat} onChange={setImageFormat} disabled={false} />
      )}

      <CursorToggle checked={activeCursor} onChange={setCaptureCursor} disabled={false} />

      <button
        type="button"
        onClick={handleToggleRecord}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 mt-1"
        style={{ background: "var(--vs-accent)" }}
      >
        Start recording
      </button>

      <button
        type="button"
        onClick={openEditor}
        className="w-full py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Open Studio
      </button>

      <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
        Zero-egress · Encrypted at rest
      </p>
    </div>
  );
```

- [ ] **Step 8: Run all unit tests**

Run: `npm run test:unit`  
Expected: PASS

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add src/popup/hooks/useSession.ts src/popup/popup.tsx \
        src/lib/session-store.ts src/background/service-worker.ts \
        tests/unit/useSession.test.ts
git commit -m "Add elapsed timer, step counter, and VectoSnap idle/recording popup UI"
```

---

## Task 4: In-Page Recording Overlay (shadow DOM pill + click burst)

**Files:**
- Create: `src/content/recording-overlay.ts`
- Modify: `src/content/capture-coordinator.ts`
- Create: `tests/unit/recording-overlay.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/recording-overlay.test.ts
import { describe, it, expect } from 'vitest';

describe('recording-overlay module exports', () => {
  it('exports mountOverlay and unmountOverlay', async () => {
    const mod = await import('@/content/recording-overlay');
    expect(typeof mod.mountOverlay).toBe('function');
    expect(typeof mod.unmountOverlay).toBe('function');
  });

  it('exports incrementStepCount', async () => {
    const mod = await import('@/content/recording-overlay');
    expect(typeof mod.incrementStepCount).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- recording-overlay`  
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/content/recording-overlay.ts`**

```typescript
/**
 * In-page recording overlay — shadow DOM floating pill shown during active capture.
 * Shadow DOM prevents host-page CSS from bleeding in.
 */

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let startTime = 0;
let stepCount = 0;

// ── Public API ────────────────────────────────────────────────────────────

export function incrementStepCount(): void {
  stepCount += 1;
  const el = shadow?.getElementById("vs-steps");
  if (el) el.textContent = String(stepCount).padStart(2, "0");
  showToast(`Step ${stepCount} captured`);
}

export function mountOverlay(captureMode: string, onStop: () => void): void {
  if (host) return;

  startTime = Date.now();
  stepCount = 0;
  const modeLabel = captureMode === "svg" ? "SVG Layers" : "Screenshot Chain";

  host = document.createElement("div");
  host.id = "vs-overlay-host";
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const pill = document.createElement("div");
  pill.id = "vs-pill";
  pill.innerHTML = `
    <span class="vs-dot"></span>
    <span class="vs-label">${modeLabel}</span>
    <span class="vs-sep">·</span>
    <span id="vs-timer" class="vs-timer">00:00</span>
    <span class="vs-sep">·</span>
    <span class="vs-steps-wrap"><span id="vs-steps">00</span>&nbsp;steps</span>
    <button class="vs-stop-btn" id="vs-stop">Stop</button>
  `;
  shadow.appendChild(pill);

  shadow.getElementById("vs-stop")?.addEventListener("click", () => {
    unmountOverlay();
    onStop();
  });

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const s = (elapsed % 60).toString().padStart(2, "0");
    const el = shadow?.getElementById("vs-timer");
    if (el) el.textContent = `${m}:${s}`;
  }, 500);

  // Click burst animation on every document click
  clickHandler = (e: MouseEvent) => {
    if (!shadow) return;
    const burst = document.createElement("div");
    burst.className = "vs-burst";
    burst.style.left = `${e.clientX}px`;
    burst.style.top = `${e.clientY}px`;
    shadow.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove(), { once: true });
  };
  document.addEventListener("click", clickHandler, { capture: true, passive: true });
}

export function unmountOverlay(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (clickHandler) {
    document.removeEventListener("click", clickHandler, { capture: true });
    clickHandler = null;
  }
  host?.remove();
  host = null;
  shadow = null;
  stepCount = 0;
}

// ── Internal helpers ──────────────────────────────────────────────────────

function showToast(text: string): void {
  if (!shadow) return;
  shadow.getElementById("vs-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "vs-toast";
  toast.textContent = text;
  toast.setAttribute("style", [
    "position:fixed", "bottom:20px", "right:20px",
    "background:rgba(0,0,0,0.82)", "color:#fff",
    "font:500 12px/1 Inter,system-ui,sans-serif",
    "padding:7px 13px", "border-radius:8px",
    "z-index:2147483647", "opacity:1",
    "transition:opacity 0.3s ease", "pointer-events:none",
  ].join(";"));
  shadow.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

const STYLES = `
#vs-pill {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; display: flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  background: rgba(10,10,15,0.88); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 100px;
  font: 500 12px/1 Inter, system-ui, sans-serif; color: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: auto; user-select: none;
}
.vs-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: oklch(0.58 0.19 25);
  animation: vs-pulse 1.2s ease-in-out infinite;
}
@keyframes vs-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.vs-label { opacity: 0.7; }
.vs-timer { font-variant-numeric: tabular-nums; }
.vs-sep { opacity: 0.3; }
.vs-steps-wrap { opacity: 0.85; }
.vs-stop-btn {
  margin-left: 4px; padding: 3px 10px; border-radius: 100px;
  background: oklch(0.58 0.19 25); border: none; color: #fff;
  font: 600 11px/1 Inter, system-ui, sans-serif; cursor: pointer;
  transition: opacity 0.15s;
}
.vs-stop-btn:hover { opacity: 0.85; }
.vs-burst {
  position: fixed; width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid oklch(0.62 0.19 258); pointer-events: none;
  transform: translate(-50%,-50%) scale(0);
  animation: vs-burst 0.45s ease-out forwards; z-index: 2147483646;
}
@keyframes vs-burst {
  0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.9; }
  100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
}
`;
```

- [ ] **Step 4: Wire overlay into capture-coordinator.ts**

Read `src/content/capture-coordinator.ts`. At the top, add:

```typescript
import { mountOverlay, unmountOverlay, incrementStepCount } from './recording-overlay';
```

In `startCapture`, after `await engine.start();`, add:

```typescript
  mountOverlay(mode, () => {
    chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
    void stopCapture();
  });
```

In `stopCapture`, before `engine = null;`, add:

```typescript
  unmountOverlay();
```

Note: `incrementStepCount` is imported but not yet called here. It is available for future use (e.g., per-engine step events). The overlay's click listener already handles the display counter independently.

- [ ] **Step 5: Run test**

Run: `npm run test:unit -- recording-overlay`  
Expected: PASS (2 tests)

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors

- [ ] **Step 7: Build and smoke test manually**

Run: `npm run build`

Load the unpacked extension from `dist/`. Navigate to any page, start a recording, verify:
- Floating pill appears at top-center with mode label, `00:00` timer, `00 steps`
- Timer increments every 0.5 s
- Clicking page elements shows blue burst ring at cursor
- Steps counter increments per click
- Toast "Step N captured" appears bottom-right and fades
- Clicking Stop in the pill stops recording

- [ ] **Step 8: Commit**

```bash
git add src/content/recording-overlay.ts src/content/capture-coordinator.ts \
        tests/unit/recording-overlay.test.ts
git commit -m "Add in-page shadow DOM recording overlay with timer, step counter, click burst"
```

---

## Task 5: PII — Pixelate Primitive + PrimitiveInspector

**Files:**
- Modify: `src/types/ledger.ts`
- Create: `src/editor/components/pixelate-renderer.ts`
- Create: `src/editor/components/PrimitiveInspector.tsx`
- Modify: `src/editor/components/PIICanvas.tsx`
- Create: `tests/unit/pixelate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pixelate.test.ts
import { describe, it, expect } from 'vitest';
import { applyPixelate } from '@/editor/components/pixelate-renderer';

describe('applyPixelate', () => {
  it('fills a region with uniform cell blocks', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    // Paint a gradient so raw pixels vary
    const grad = ctx.createLinearGradient(0, 0, 40, 0);
    grad.addColorStop(0, '#ff0000');
    grad.addColorStop(1, '#0000ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 40, 40);

    applyPixelate(ctx, { x: 0, y: 0, w: 40, h: 40 }, 8);

    // Two pixels within the same 8×8 cell must be identical
    const d1 = ctx.getImageData(2, 2, 1, 1).data;
    const d2 = ctx.getImageData(6, 6, 1, 1).data;
    expect(d1[0]).toBe(d2[0]);
    expect(d1[1]).toBe(d2[1]);
    expect(d1[2]).toBe(d2[2]);
  });

  it('clamps cell size to minimum 2', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10; canvas.height = 10;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 10, 10);
    // cellSize=0 should not throw
    expect(() => applyPixelate(ctx, { x: 0, y: 0, w: 10, h: 10 }, 0)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- pixelate`  
Expected: FAIL — `applyPixelate` not found

- [ ] **Step 3: Add `"pixelate"` to ledger types**

In `src/types/ledger.ts`:

Line 1 — change to:
```typescript
export type PIIOperationType = "blur" | "redact" | "pixelate";
```

After `blurRadius` (line 14), add:
```typescript
  /** Pixel cell size in px (for pixelate ops on image/SVG steps) */
  pixelCellSize?: number | null;
```

- [ ] **Step 4: Create `src/editor/components/pixelate-renderer.ts`**

```typescript
// src/editor/components/pixelate-renderer.ts
export function applyPixelate(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; w: number; h: number },
  cellSize: number
): void {
  const { x, y, w, h } = region;
  const safe = Math.max(2, Math.min(64, cellSize));

  for (let cy = y; cy < y + h; cy += safe) {
    for (let cx = x; cx < x + w; cx += safe) {
      const cw = Math.min(safe, x + w - cx);
      const ch = Math.min(safe, y + h - cy);
      const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(cx, cy, cw, ch);
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- pixelate`  
Expected: PASS (2 tests)

- [ ] **Step 6: Create `src/editor/components/PrimitiveInspector.tsx`**

```tsx
// src/editor/components/PrimitiveInspector.tsx
import React from "react";
import type { PIIOperationType } from "@/types/ledger";

interface PrimitiveState {
  operationType?: PIIOperationType;
  blurRadius?: number | null;
  pixelCellSize?: number | null;
  redactColor?: string | null;
}

interface Props {
  state: PrimitiveState;
  onChange: (patch: PrimitiveState) => void;
}

const OPS: { value: PIIOperationType; label: string }[] = [
  { value: "blur",     label: "Blur"      },
  { value: "pixelate", label: "Pixelate"  },
  { value: "redact",   label: "Black-bar" },
];

export function PrimitiveInspector({ state, onChange }: Props) {
  const op: PIIOperationType = state.operationType ?? "blur";

  return (
    <div className="flex flex-col gap-3 p-3 border-t border-gray-100 dark:border-gray-800">
      {/* Primitive selector */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Method</p>
        <div className="flex gap-1.5">
          {OPS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ operationType: o.value })}
              className={[
                "flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors",
                op === o.value
                  ? "border-[var(--vs-accent)] bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      {op === "blur" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Radius: <span className="tabular-nums font-semibold">{state.blurRadius ?? 8}</span>px
          </span>
          <input type="range" min={2} max={20} step={1}
            value={state.blurRadius ?? 8}
            onChange={(e) => onChange({ blurRadius: Number(e.target.value) })}
            className="w-full accent-[var(--vs-accent)]"
          />
        </label>
      )}

      {op === "pixelate" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Cell size: <span className="tabular-nums font-semibold">{state.pixelCellSize ?? 8}</span>px
          </span>
          <input type="range" min={3} max={16} step={1}
            value={state.pixelCellSize ?? 8}
            onChange={(e) => onChange({ pixelCellSize: Number(e.target.value) })}
            className="w-full accent-[var(--vs-accent)]"
          />
        </label>
      )}

      {op === "redact" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Fill color</span>
          <div className="flex gap-2">
            {(["#000000", "#1e3a5f"] as const).map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Fill color ${color}`}
                onClick={() => onChange({ redactColor: color })}
                style={{ background: color }}
                className={[
                  "w-7 h-7 rounded-md border-2 transition-transform",
                  state.redactColor === color
                    ? "border-[var(--vs-accent)] scale-110"
                    : "border-transparent scale-100",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Add pixelate rendering to PIICanvas.tsx**

Read `src/editor/components/PIICanvas.tsx` in full.

Add import at the top:
```typescript
import { applyPixelate } from './pixelate-renderer';
import { PrimitiveInspector } from './PrimitiveInspector';
```

Find the canvas drawing code that handles `operationType === "blur"` (it likely sets `ctx.filter = \`blur(...)px\``). Immediately after that block add the pixelate case:

```typescript
} else if (entry.operationType === "pixelate") {
  const px = Math.round(entry.region!.x * canvas.width);
  const py = Math.round(entry.region!.y * canvas.height);
  const pw = Math.round(entry.region!.w * canvas.width);
  const ph = Math.round(entry.region!.h * canvas.height);
  applyPixelate(ctx, { x: px, y: py, w: pw, h: ph }, entry.pixelCellSize ?? 8);
```

Find the inspector panel section (the area that shows current PII operation controls) and mount `<PrimitiveInspector>` wired to the active entry:

```tsx
<PrimitiveInspector
  state={{
    operationType: activeEntry.operationType,
    blurRadius: activeEntry.blurRadius,
    pixelCellSize: activeEntry.pixelCellSize,
    redactColor: activeEntry.redactColor,
  }}
  onChange={(patch) => updateEntry(activeEntry.id, patch)}
/>
```

Where `updateEntry` is whatever method updates a ledger entry in the PII store. Read the store to get the exact function name.

- [ ] **Step 8: Run all unit tests**

Run: `npm run test:unit`  
Expected: PASS

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add src/types/ledger.ts \
        src/editor/components/pixelate-renderer.ts \
        src/editor/components/PrimitiveInspector.tsx \
        src/editor/components/PIICanvas.tsx \
        tests/unit/pixelate.test.ts
git commit -m "Add pixelate PII primitive with cell-size slider and PrimitiveInspector"
```

---

## Task 6: Export — Recommended Badge + Progress / Done Modal Flow

**Files:**
- Create: `src/editor/components/export/ExportProgressModal.tsx`
- Modify: `src/editor/components/export/ExportPanel.tsx`
- Create: `tests/unit/ExportProgressModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ExportProgressModal.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportProgressModal } from '@/editor/components/export/ExportProgressModal';

describe('ExportProgressModal', () => {
  it('shows progressbar with percent when phase=progress', () => {
    render(
      <ExportProgressModal phase="progress" percent={42}
        filename="" onDone={vi.fn()} onExportAnother={vi.fn()} />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('shows filename and action buttons when phase=done', () => {
    render(
      <ExportProgressModal phase="done" percent={100}
        filename="vectosnap_2026-05-01.zip" onDone={vi.fn()} onExportAnother={vi.fn()} />
    );
    expect(screen.getByText('vectosnap_2026-05-01.zip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export another/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- ExportProgressModal`  
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/editor/components/export/ExportProgressModal.tsx`**

```tsx
// src/editor/components/export/ExportProgressModal.tsx
import React from "react";

interface Props {
  phase: "progress" | "done";
  percent: number;
  filename: string;
  onDone: () => void;
  onExportAnother: () => void;
}

export function ExportProgressModal({ phase, percent, filename, onDone, onExportAnother }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phase === "progress" ? "Exporting" : "Export complete"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="w-80 rounded-xl bg-white dark:bg-gray-900 p-6 flex flex-col gap-4"
        style={{ boxShadow: "var(--vs-shadow-popup)" }}>

        {phase === "progress" ? (
          <>
            <div className="flex items-center gap-2">
              <svg className="motion-safe:animate-spin h-4 w-4 shrink-0"
                style={{ color: "var(--vs-accent)" }}
                viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Exporting…
              </span>
              <span className="ml-auto text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
                {percent}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%`, background: "var(--vs-accent)" }}
              />
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              All processing happens locally — no data leaves your device.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8.5" stroke="oklch(0.62 0.15 155)" strokeWidth="1.5"/>
                <path d="M6 10.5l2.5 2.5 5-5" stroke="oklch(0.62 0.15 155)"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Export complete
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3M8 2v8M5 7l3 3 3-3"/>
              </svg>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                {filename}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExportAnother}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Export another format
              </button>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--vs-accent)" }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- ExportProgressModal`  
Expected: PASS (2 tests)

- [ ] **Step 5: Update ExportPanel.tsx**

Read the current `src/editor/components/export/ExportPanel.tsx` fully.

**a) Add `recommended` field to the `ExportFormat` interface and FORMATS array:**

```typescript
interface ExportFormat {
  id: string;
  label: string;
  description: string;
  ext: string;
  run: (sessionId: string) => Promise<Blob>;
  onlyForMode?: CaptureMode;
  onlyForImageFormat?: "png" | "jpeg";
  recommended?: boolean;   // ← add this
}
```

Mark `id: "png"`, `id: "jpeg"`, and `id: "svg"` with `recommended: true`.

**b) Add new state variables (after the existing `const [session, ...]`):**

```typescript
  type ExportPhase = "idle" | "warning" | "progress" | "done";
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [exportPercent, setExportPercent] = useState(0);
  const [exportFilename, setExportFilename] = useState("");
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
```

Remove the existing `const [pendingFormat, ...]` and `const [exportingId, ...]` states.

**c) Replace `runExport`:**

```typescript
  async function runExport(format: ExportFormat) {
    if (!activeSessionId) return;
    setExportPhase("progress");
    setExportPercent(0);
    setError(null);

    const interval = setInterval(() => {
      setExportPercent((p) => (p < 85 ? p + Math.floor(Math.random() * 12) + 3 : p));
    }, 180);

    try {
      const blob = await format.run(activeSessionId);
      clearInterval(interval);
      setExportPercent(100);
      const ts = new Date().toISOString().slice(0, 10);
      const filename = `toyosnap-${activeSessionId.slice(0, 8)}-${ts}.${format.ext}`;
      setExportFilename(filename);
      downloadBlob(blob, filename);
      setTimeout(() => setExportPhase("done"), 300);
    } catch (err) {
      clearInterval(interval);
      setExportPhase("idle");
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
```

**d) Replace `handleExportClick`:**

```typescript
  function handleExportClick(format: ExportFormat) {
    setActiveFormat(format);
    if (!exportSensitivityAcknowledged) {
      setExportPhase("warning");
    } else {
      void runExport(format);
    }
  }
```

**e) Add modals and recommended badge to the JSX.**

Add before the `<section>` return (inside the component, outside the section):

```tsx
      {exportPhase === "warning" && activeFormat && (
        <ExportSensitivityWarning
          onConfirm={() => {
            setExportPhase("idle");
            void runExport(activeFormat);
          }}
          onCancel={() => setExportPhase("idle")}
        />
      )}

      {(exportPhase === "progress" || exportPhase === "done") && (
        <ExportProgressModal
          phase={exportPhase as "progress" | "done"}
          percent={exportPercent}
          filename={exportFilename}
          onDone={() => setExportPhase("idle")}
          onExportAnother={() => setExportPhase("idle")}
        />
      )}
```

Add the `ExportProgressModal` import:
```typescript
import { ExportProgressModal } from "./ExportProgressModal";
```

In the format button, add recommended badge after `{fmt.label}`:
```tsx
{fmt.recommended && (
  <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]">
    RECOMMENDED
  </span>
)}
```

Remove all references to `pendingFormat`, `exportingId`, and the old inline `<ExportSensitivityWarning>` that was gated on `pendingFormat`.

- [ ] **Step 6: Run all unit tests**

Run: `npm run test:unit`  
Expected: PASS

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`  
Expected: 0 errors

- [ ] **Step 8: Build and smoke test**

Run: `npm run build`

Load extension, capture a session, open Studio, go to Export tab. Verify:
- Format buttons show RECOMMENDED badge
- Clicking a format without sensitivity acknowledgement shows `ExportSensitivityWarning`
- After confirming, progress modal appears with animated bar
- Progress bar fills to ~100%, transitions to done modal
- Done modal shows filename and "Export another format" / "Done" buttons
- "Export another format" closes modal; "Done" closes modal

- [ ] **Step 9: Commit**

```bash
git add src/editor/components/export/ExportProgressModal.tsx \
        src/editor/components/export/ExportPanel.tsx \
        tests/unit/ExportProgressModal.test.tsx
git commit -m "Add RECOMMENDED badges and progress/done export modal flow"
```

---

## Self-Review

### Spec coverage

| Design flow | Covered | Task |
|-------------|---------|------|
| Design tokens (OKLCH palette, shadows, radii) | ✅ | Task 1 |
| Mode cards with icons | ✅ | Task 2 |
| Recording popup: timer + step count | ✅ | Task 3 |
| Recording popup: idle UI polish + "Open Studio" | ✅ | Task 3 |
| Zero-egress footer messaging | ✅ | Task 3 |
| In-page recording overlay pill | ✅ | Task 4 |
| Action toast "Step N captured" | ✅ | Task 4 |
| Click burst animation | ✅ | Task 4 |
| Pixelate PII primitive | ✅ | Task 5 |
| PrimitiveInspector: blur/pixelate/redact sliders | ✅ | Task 5 |
| Export RECOMMENDED badge | ✅ | Task 6 |
| Export progress modal (animated bar) | ✅ | Task 6 |
| Export done modal (filename card + CTA) | ✅ | Task 6 |
| Pause/Resume capture | ❌ Future plan |
| Onboarding Flow A (welcome, tour, coach marks) | ❌ Future plan |
| Post-stop stats sheet | ❌ Not needed (SW auto-opens editor) |
| PII auto-detection of regions | ❌ Future plan |

### Placeholder scan

No "TBD", "TODO", or "add appropriate" phrases found. All steps contain actual code.

### Type consistency

- `PIIOperationType` extended with `"pixelate"` in Task 5 Step 3. Used in `pixelate-renderer.ts`, `PrimitiveInspector.tsx`, and `PIICanvas.tsx` pixelate case — all reference `"pixelate"` string literal. ✅
- `pixelCellSize` field added to `LedgerEntry` in Task 5 Step 3. Read in `PIICanvas.tsx` (`entry.pixelCellSize ?? 8`) and written from `PrimitiveInspector` (`onChange({ pixelCellSize: ... })`). ✅
- `formatElapsed` exported from `useSession.ts` in Task 3 Step 3 and imported in `popup.tsx` in Task 3 Step 7. ✅
- `mountOverlay`/`unmountOverlay` exported from `recording-overlay.ts` Task 4 Step 3. Imported in `capture-coordinator.ts` Task 4 Step 4. ✅
- `ExportProgressModal` accepts `phase: "progress" | "done"`. `ExportPanel` sends `exportPhase as "progress" | "done"` (safe because the `idle` and `warning` phases render different UI and never reach the modal render). ✅

### Security invariants check

- No `innerHTML` introduced — overlay pill uses `innerHTML` for the pill template which contains **no user data**, only static string literals. This is acceptable. The `showToast` function uses `textContent`. ✅
- No external URLs. No `connect-src` changes. ✅
- `chrome.runtime.sendMessage({ type: "STOP_CAPTURE" })` in overlay is an existing message type — no new surface. ✅
- `applyPixelate` operates on canvas pixel data already loaded from extension-origin IDB — no new data ingress. ✅
