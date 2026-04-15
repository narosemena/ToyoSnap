import React from "react";
import { createRoot } from "react-dom/client";
import { ModeSelector } from "./components/ModeSelector";
import { RecordButton } from "./components/RecordButton";
import { CursorToggle } from "./components/CursorToggle";
import { StatusBadge } from "./components/StatusBadge";
import { useSession } from "./hooks/useSession";
import type { CaptureMode } from "@/types/capture";
import type { ExtensionMessage } from "@/types/messages";
import "../styles/globals.css";

function Popup() {
  // Local state for configuration BEFORE recording starts
  const [mode, setMode] = React.useState<CaptureMode>("rrweb");
  const [captureCursor, setCaptureCursor] = React.useState(true);

  // Hook handles global recording state synced with Service Worker
  const { 
    isRecording, 
    captureMode, 
    captureCursor: sessionCursor, 
    loading, 
    refreshState 
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
        payload: { mode, captureCursor },
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

  // Prevent flicker while the hook performs the initial handshake with the SW
  if (loading) return null;

  return (
    <div className="flex flex-col gap-3 p-4 min-w-60 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide uppercase opacity-70">ToyoSnap</span>
        <StatusBadge isRecording={isRecording} />
      </div>

      <ModeSelector 
        value={activeMode} 
        onChange={setMode} 
        disabled={isRecording} 
      />
      
      <CursorToggle 
        checked={activeCursor} 
        onChange={setCaptureCursor} 
        disabled={isRecording} 
      />

      <div className="mt-2">
        <RecordButton 
          isRecording={isRecording} 
          onClick={handleToggleRecord} 
        />
      </div>

      <button
        type="button"
        onClick={openEditor}
        className="text-xs text-center text-blue-600 dark:text-blue-400 hover:underline mt-2 transition-opacity duration-150 hover:opacity-80 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded"
      >
        Open Vault & Editor
      </button>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}