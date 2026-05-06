import React from "react";
import { createRoot } from "react-dom/client";
import { ModeSelector } from "./components/ModeSelector";
import { CursorToggle } from "./components/CursorToggle";
import { StatusBadge } from "./components/StatusBadge";
import { ImageFormatSelector } from "./components/ImageFormatSelector";
import { RecordingComplete } from "./components/RecordingComplete";
import { useSession, formatElapsed } from "./hooks/useSession";
import type { CaptureMode } from "@/types/capture";
import type { ExtensionMessage } from "@/types/messages";
import "../styles/globals.css";

const RECORDING_MODE_LABELS: Record<string, string> = {
  'image-chain': 'PNG chain',
  'svg': 'Layered SVG',
  'video': 'Video',
  'rrweb': 'HTML replay',
};

export function Popup() {
  // Local state for configuration BEFORE recording starts
  const [mode, setMode] = React.useState<CaptureMode>("image-chain");
  const [captureCursor, setCaptureCursor] = React.useState(false);
  const [imageFormat, setImageFormat] = React.useState<"png" | "jpeg">("png");

  const [justStopped, setJustStopped] = React.useState(false);
  const [stoppedSummary, setStoppedSummary] = React.useState<{
    steps: number; durationMs: number; mode: CaptureMode;
  } | null>(null);

  // Hook handles global recording state synced with Service Worker
  const {
    isRecording,
    captureMode,
    captureCursor: sessionCursor,
    loading,
    refreshState,
    elapsedMs,
    stepCount,
    hasSessions,
    isPaused,
  } = useSession();

  /**
   * UI Logic: If we are recording, the UI should reflect the settings
   * used when the session started. If not, it shows the local selection.
   */
  const activeMode = isRecording && captureMode ? captureMode : mode;
  const activeCursor = isRecording && sessionCursor !== undefined ? sessionCursor : captureCursor;

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
        // Optional: Small delay to let the SW finish vaulting before UI refresh
        setTimeout(refreshState, 50);
      });
    } else {
      const msg: ExtensionMessage = {
        type: "START_CAPTURE",
        payload: { mode, captureCursor, imageFormat: mode === "image-chain" ? imageFormat : undefined },
      };
      chrome.runtime.sendMessage(msg, () => {
        refreshState();
      });
    }
  }

  function handleTogglePause() {
    const type = (isPaused ? 'RESUME_CAPTURE' : 'PAUSE_CAPTURE') as ExtensionMessage['type'];
    chrome.runtime.sendMessage({ type } as ExtensionMessage);
  }

  function openEditor() {
    const url = chrome.runtime.getURL("src/editor/editor.html");
    void chrome.tabs.create({ url });
  }

  const shell = 'flex flex-col w-[360px] bg-white dark:bg-[#1d2230] text-[#1d2230] dark:text-gray-100 rounded-[14px] border border-[oklch(0.9_0.008_258)] overflow-hidden';
  const shellShadow: React.CSSProperties = { boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)' };

  if (loading) return <div className={shell} style={shellShadow} />;

  if (justStopped && stoppedSummary) {
    return (
      <div className={shell} style={shellShadow}>
        <div className="flex items-center gap-[10px] border-b border-[oklch(0.94_0.005_258)]" style={{ padding: '14px 16px 10px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="vs-idle-logo" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
                <stop offset="100%" stopColor="oklch(0.58 0.19 25)"/>
              </linearGradient>
            </defs>
            <rect width="20" height="20" rx="5" fill="url(#vs-idle-logo)"/>
            <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
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

  // ── Recording state ─────────────────────────────────────────────────────
  if (isRecording) {
    const mm = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
    const ss = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');
    const modeMeta = RECORDING_MODE_LABELS[captureMode ?? 'image-chain'];
    const storageMB = ((stepCount ?? 0) * 0.18).toFixed(1);

    return (
      <div className={shell} style={shellShadow}>
        <div className="flex items-center gap-[10px] border-b border-[oklch(0.94_0.005_258)]" style={{ padding: '14px 16px 10px' }}>
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

        <div className="flex flex-col gap-[14px]" style={{ padding: '14px 16px 16px' }}>
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
                <div className="text-[28px] font-semibold leading-none mt-1" style={{ fontVariantNumeric: 'tabular-nums', color: '#1d2230' }}>
                  {mm}:{ss}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.6px]" style={{ color: '#6a7180' }}>
                  Steps captured
                </div>
                <div className="text-[28px] font-semibold leading-none mt-1" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.38 0.14 258)' }}>
                  {String(stepCount ?? 0).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] p-[10px] text-xs" style={{ background: '#f7f8fa' }}>
            <div className="flex items-center justify-between py-1">
              <span style={{ color: '#6a7180' }}>Mode</span>
              <span className="font-semibold">{modeMeta}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span style={{ color: '#6a7180' }}>Cursor</span>
              <span className="font-semibold">{activeCursor ? 'Captured' : 'Hidden'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span style={{ color: '#6a7180' }}>Storage</span>
              <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{storageMB} MB</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTogglePause}
              className="flex-1 py-[10px] rounded-[10px] text-[13px] font-semibold flex items-center justify-center transition-colors"
              style={{
                background: '#fff',
                border: '1px solid oklch(0.9 0.008 258)',
                color: '#1d2230',
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={handleToggleRecord}
              className="flex-[1.4] py-[10px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: 'oklch(0.58 0.19 25)' }}
            >
              Stop &amp; review
            </button>
          </div>
        </div>

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
          Captured locally · {stepCount ?? 0} step{(stepCount ?? 0) === 1 ? '' : 's'} encrypted
        </div>
      </div>
    );
  }

  // ── Idle state ───────────────────────────────────────────────────────────
  return (
    <div className={shell} style={shellShadow}>
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vs-popup-logo-gradient" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
              <stop offset="100%" stopColor="oklch(0.58 0.19 25)"/>
            </linearGradient>
          </defs>
          <rect width="20" height="20" rx="5" fill="url(#vs-popup-logo-gradient)"/>
          <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-semibold">ToyoSnap</span>
        <div className="ml-auto">
          <StatusBadge isRecording={isRecording} isPaused={false} />
        </div>
      </div>

      <ModeSelector value={activeMode} onChange={setMode} disabled={isRecording} />

      {activeMode === "image-chain" && (
        <ImageFormatSelector value={imageFormat} onChange={setImageFormat} disabled={isRecording} />
      )}

      <CursorToggle checked={activeCursor} onChange={setCaptureCursor} disabled={isRecording} />

      <button
        type="button"
        onClick={handleToggleRecord}
        className="w-full py-[12px] px-[14px] rounded-[10px] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-1"
        style={{ background: 'oklch(0.58 0.19 258)' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4" fill="white"/>
        </svg>
        Start recording
      </button>

      {hasSessions && (
        <button
          type="button"
          onClick={openEditor}
          className="w-full py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Open Studio
        </button>
      )}

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
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}
