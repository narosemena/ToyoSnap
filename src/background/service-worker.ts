/**
 * Service Worker — master state machine for ToyoSnap.
 *
 * Security invariants (do not remove):
 *  - Every onMessage handler calls isValidSender(sender) before processing
 *  - captureVisibleTab called here (SW-only API), not in content scripts
 *  - tabCapture permission is intentionally absent from the manifest
 */
import { isValidSender } from "@/security/message-validator";
import {
  getSessionControlPlane,
  setSessionControlPlane,
  clearSessionControlPlane,
} from "@/lib/session-store";
import {
  putSession,
  getSession,
  countStepsBySession,
} from "@/storage/ephemeral-db";
import type { ExtensionMessage } from "@/types/messages";
import type { CaptureSession } from "@/types/capture";

// ── Badge helpers ─────────────────────────────────────────────────────────────

function setBadgeRecording(): void {
  chrome.action.setBadgeText({ text: "REC" });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6B7280" });
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    if (!isValidSender(sender)) return; // drop messages from external origins silently

    const msg = rawMsg as ExtensionMessage;

    switch (msg.type) {
      case "START_CAPTURE":
        void handleStartCapture(msg.payload.mode, msg.payload.captureCursor, sender, sendResponse);
        return true; // keep message channel open for async response

      case "STOP_CAPTURE":
        void handleStopCapture(sender);
        break;

      case "TRIGGER_CAPTURE_VISIBLE_TAB":
        void handleCaptureVisibleTab(msg.payload.tabId, sendResponse);
        return true;

      default:
        if (process.env.NODE_ENV === "development") {
          console.warn("[ToyoSnap SW] unhandled message type:", (msg as { type: string }).type);
        }
    }
  }
);

async function handleStartCapture(
  mode: ExtensionMessage & { type: "START_CAPTURE" } extends { payload: infer P } ? P["mode"] : never,
  captureCursor: boolean,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void
): Promise<void> {
  const tabId = sender.tab?.id;
  if (!tabId) {
    sendResponse({ error: "No tab ID in sender" });
    return;
  }

  const sessionId = crypto.randomUUID();

  // Atomic write — single set() call avoids TOCTOU race
  await setSessionControlPlane({
    isRecording: true,
    captureMode: mode,
    captureCursor,
    activeSessionId: sessionId,
    recordingStartedAt: Date.now(),
    activeTabId: tabId,
  });

  const session: CaptureSession = {
    id: sessionId,
    mode,
    startedAt: Date.now(),
    endedAt: null,
    stepCount: 0,
    captureCursor,
    hostnames: [],
  };
  await putSession(session);

  setBadgeRecording();

  // Push BEGIN_CAPTURE to the content script
  const beginMsg: ExtensionMessage = {
    type: "BEGIN_CAPTURE",
    payload: { sessionId, mode, captureCursor },
  };
  await chrome.tabs.sendMessage(tabId, beginMsg);

  sendResponse({ sessionId });
}

async function handleStopCapture(sender: chrome.runtime.MessageSender): Promise<void> {
  const plane = await getSessionControlPlane();
  if (!plane?.isRecording) return;

  const { activeSessionId, activeTabId } = plane;

  // Finalize session record
  const session = await getSession(activeSessionId);
  if (session) {
    const stepCount = await countStepsBySession(activeSessionId);
    await putSession({ ...session, endedAt: Date.now(), stepCount });
  }

  // Clear control plane
  await clearSessionControlPlane();
  clearBadge();

  // Notify content script — wrap in try/catch in case tab closed
  try {
    const endMsg: ExtensionMessage = { type: "END_CAPTURE" };
    await chrome.tabs.sendMessage(activeTabId, endMsg);
  } catch {
    // Tab may have been closed — safe to ignore
  }
}

async function handleCaptureVisibleTab(
  tabId: number,
  sendResponse: (r: unknown) => void
): Promise<void> {
  try {
    // captureVisibleTab returns a data URL (PNG)
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
    // Convert data URL to ArrayBuffer
    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    sendResponse({ buffer });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
}

// ── Cross-domain SSO survival ─────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;

  void (async () => {
    const plane = await getSessionControlPlane();
    if (!plane?.isRecording || tabId !== plane.activeTabId) return;

    // Update activeTabId for same-tab cross-domain navigations
    await setSessionControlPlane({ activeTabId: tabId });

    const resumeMsg: ExtensionMessage = {
      type: "RESUME_CAPTURE",
      payload: {
        sessionId: plane.activeSessionId,
        captureMode: plane.captureMode,
        captureCursor: plane.captureCursor,
      },
    };

    try {
      await chrome.tabs.sendMessage(tabId, resumeMsg);
    } catch {
      // Content script not yet ready — self-resume fallback in content-script.ts covers this
    }
  })();
});

// ── Tab removal — graceful stop ───────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const plane = await getSessionControlPlane();
    if (!plane?.isRecording || tabId !== plane.activeTabId) return;

    // Finalize session cleanly when the recorded tab is closed
    const session = await getSession(plane.activeSessionId);
    if (session) {
      const stepCount = await countStepsBySession(plane.activeSessionId);
      await putSession({ ...session, endedAt: Date.now(), stepCount });
    }

    await clearSessionControlPlane();
    clearBadge();
  })();
});

// ── Extension install / startup ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  clearBadge();
});
