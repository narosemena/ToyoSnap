import React from "react";
import { createRoot } from "react-dom/client";
import { ModeSelector } from "./components/ModeSelector";
import { CursorToggle } from "./components/CursorToggle";
import { StatusBadge } from "./components/StatusBadge";
import { ImageFormatSelector } from "./components/ImageFormatSelector";
import { useSession, formatElapsed } from "./hooks/useSession";
import type { CaptureMode } from "@/types/capture";
import type { ExtensionMessage } from "@/types/messages";
import "../styles/globals.css";

export function Popup() {
  // Local state for configuration BEFORE recording starts
  const [mode, setMode] = React.useState<CaptureMode>("image-chain");
  const [captureCursor, setCaptureCursor] = React.useState(false);
  const [imageFormat, setImageFormat] = React.useState<"png" | "jpeg">("png");

  // Hook handles global recording state synced with Service Worker
  const {
    isRecording,
    captureMode,
    captureCursor: sessionCursor,
    loading,
    refreshState,
    elapsedMs,
    stepCount,
  } = useSession();

  /**
   * UI Logic: If we are recording, the UI should reflect the settings
   * used when the session started. If not, it shows the local selection.
   */
  const activeMode = isRecording && captureMode ? captureMode : mode;
  const activeCursor = isRecording && sessionCursor !== undefined ? sessionCursor : captureCursor;

  function handleToggleRecord() {
    if (isRecording) {
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

  function openEditor() {
    const url = chrome.runtime.getURL("src/editor/editor.html");
    void chrome.tabs.create({ url });
  }

  const shell = 'flex flex-col w-[360px] bg-white dark:bg-[#1d2230] text-[#1d2230] dark:text-gray-100 rounded-[14px] border border-[oklch(0.9_0.008_258)] overflow-hidden';
  const shellShadow: React.CSSProperties = { boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)' };

  if (loading) return <div className={shell} style={shellShadow} />;

  // ── Recording state ─────────────────────────────────────────────────────
  if (isRecording) {
    return (
      <div className={shell} style={shellShadow}>
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
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}
