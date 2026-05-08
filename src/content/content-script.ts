/**
 * Content script  -  injected at document_idle into every page.
 *
 * Two resume paths (idempotent  -  whichever fires first wins):
 *  1. Push-resume: SW sends RESUME_CAPTURE via chrome.runtime.onMessage
 *  2. Self-resume fallback: proactively checks chrome.storage.session on
 *     document_idle in case the SW was sleeping and missed the tab update
 */
import type { ExtensionMessage } from "@/types/messages";
import type { CaptureMode } from "@/types/capture";
import { startCapture, stopCapture, isCapturing } from "./capture-coordinator";

// â"€â"€ Push-resume: receive messages from SW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    const msg = rawMsg as ExtensionMessage;

    switch (msg.type) {
      case "BEGIN_CAPTURE":
        void startCapture(
          msg.payload.sessionId,
          msg.payload.mode,
          msg.payload.captureCursor
        );
        sendResponse({ ok: true });
        break;

      case "RESUME_CAPTURE":
        if (msg.payload) {
          void startCapture(
            msg.payload.sessionId,
            msg.payload.captureMode,
            msg.payload.captureCursor
          );
        }
        sendResponse({ ok: true });
        break;

      case "END_CAPTURE":
        void stopCapture();
        sendResponse({ ok: true });
        break;

      default:
        break;
    }
  }
);

// â"€â"€ Self-resume fallback: handles SW sleep on document_idle â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

void (async () => {
  if (isCapturing()) return; // push-resume already fired

  const result = await chrome.storage.session.get("toyosnap_session");
  const plane = result["toyosnap_session"] as
    | { isRecording: boolean; activeSessionId: string; captureMode: CaptureMode; captureCursor: boolean }
    | undefined;

  if (plane?.isRecording && !isCapturing()) {
    await startCapture(plane.activeSessionId, plane.captureMode, plane.captureCursor);
  }
})();

// Keyboard shortcut: Alt+Shift+R -> toggle capture.
// Uses keydown (not chrome.commands) so this fires in --headless=new via
// Playwright page.keyboard.press(), which dispatches a real DOM KeyboardEvent.
document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (e.code === 'KeyR' && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'TOGGLE_CAPTURE' } as ExtensionMessage);
    }
  },
  { capture: true }
);
