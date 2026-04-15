import React from "react";
import { createRoot } from "react-dom/client";
import { ModeSelector } from "./components/ModeSelector";
import { RecordButton } from "./components/RecordButton";
import { CursorToggle } from "./components/CursorToggle";
import { StatusBadge } from "./components/StatusBadge";
import type { CaptureMode } from "@/types/capture";
import type { ExtensionMessage } from "@/types/messages";
import "../styles/globals.css";

function Popup() {
  const [mode, setMode] = React.useState<CaptureMode>("rrweb");
  const [captureCursor, setCaptureCursor] = React.useState(true);
  const [isRecording, setIsRecording] = React.useState(false);

  // Sync recording state from chrome.storage.session on mount
  React.useEffect(() => {
    void chrome.storage.session.get("toyosnap_session").then((result) => {
      const plane = result["toyosnap_session"] as { isRecording?: boolean } | undefined;
      if (plane?.isRecording) setIsRecording(true);
    });
  }, []);

  function handleToggleRecord() {
    if (isRecording) {
      const msg: ExtensionMessage = { type: "STOP_CAPTURE" };
      chrome.runtime.sendMessage(msg);
      setIsRecording(false);
    } else {
      const msg: ExtensionMessage = {
        type: "START_CAPTURE",
        payload: { mode, captureCursor },
      };
      chrome.runtime.sendMessage(msg, () => {
        setIsRecording(true);
      });
    }
  }

  function openEditor() {
    const url = chrome.runtime.getURL("src/editor/editor.html");
    void chrome.tabs.create({ url });
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide">ToyoSnap</span>
        <StatusBadge isRecording={isRecording} />
      </div>

      <ModeSelector value={mode} onChange={setMode} disabled={isRecording} />
      <CursorToggle checked={captureCursor} onChange={setCaptureCursor} disabled={isRecording} />

      <RecordButton isRecording={isRecording} onClick={handleToggleRecord} />

      <button
        type="button"
        onClick={openEditor}
        className="text-xs text-center text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        Open Editor
      </button>
    </div>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<Popup />);
