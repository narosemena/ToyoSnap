/**
 * Service Worker — master state machine for ToyoSnap.
 *
 * Security invariants (do not remove):
 * - Every onMessage handler calls isValidSender(sender) before processing
 * - captureVisibleTab called here (SW-only API), not in content scripts
 * - tabCapture permission is intentionally absent from the manifest
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
  putStep,
  getStepsBySession,
} from "@/storage/ephemeral-db";
import type { ExtensionMessage } from "@/types/messages";
import type { CaptureSession, CaptureMode, CaptureStep } from "@/types/capture";

// —— Initialization —————————————————————————————————————————————————————————

// Allow content scripts to read session storage for the self-resume fallback
chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

// —— Badge helpers ——————————————————————————————————————————————————————————

function setBadgeRecording(): void {
  chrome.action.setBadgeText({ text: "REC" });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6B7280" });
}

/**
 * Broadcasts session state changes to any open UI components (Popup/Options)
 */
async function broadcastStateUpdate() {
  const plane = await getSessionControlPlane();
  chrome.runtime.sendMessage({
    type: "SESSION_UPDATED",
    payload: plane || { isRecording: false },
  }).catch(() => {
    // Expected error if no UI listeners are active
  });
}

// —— Message handler ————————————————————————————————————————————————————————

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r: any) => void) => {
    if (!isValidSender(sender)) return; 

    const msg = rawMsg as any; 

    switch (msg.type) {
      case "GET_SESSION_STATE":
        void (async () => {
          const plane = await getSessionControlPlane();
          sendResponse(plane || { isRecording: false });
        })();
        return true;

      case "START_CAPTURE":
        void handleStartCapture(
          msg.payload.mode, 
          msg.payload.captureCursor, 
          sender, 
          sendResponse
        );
        return true;

      case "STOP_CAPTURE":
        void handleStopCapture();
        sendResponse({ status: "stopping" });
        break;

      case "TRIGGER_CAPTURE_VISIBLE_TAB":
        void handleCaptureVisibleTab(sendResponse);
        return true;

      case "RRWEB_BATCH": {
        const { sessionId, events } = msg.payload as { sessionId: string; events: unknown[] };
        if (events?.length) {
          void (async () => {
            const stepIndex = (await countStepsBySession(sessionId)) + 1;
            const step: CaptureStep = {
              sessionId,
              stepIndex,
              timestamp: Date.now(),
              url: "",
              pageTitle: "",
              blobId: null,
              rrwebEvents: events as any,
              actionStep: null,
              spotlightSelector: null,
            };
            void putStep(step);
          })();
        }
        sendResponse({ ok: true });
        break;
      }

      case "EXPORT_SESSION_DATA": {
        void (async () => {
          const { sessionId } = msg.payload as { sessionId: string };
          const steps = await getStepsBySession(sessionId);
          sendResponse({ steps });
        })();
        return true;
      }

      case "GET_TAB_ID": {
        void (async () => {
          const plane = await getSessionControlPlane();
          sendResponse({ tabId: plane?.activeTabId ?? null });
        })();
        return true;
      }

      default:
        if (process.env.NODE_ENV === "development") {
          console.warn("[ToyoSnap SW] unhandled message type:", msg.type);
        }
    }
  }
);

async function handleStartCapture(
  mode: CaptureMode,
  captureCursor: boolean,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: any) => void
): Promise<void> {
  let targetTabId = sender.tab?.id;
  
  if (!targetTabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTabId = activeTab?.id;
  }

  if (!targetTabId) {
    sendResponse({ error: "No active tab found to capture" });
    return;
  }

  const sessionId = crypto.randomUUID();

  await setSessionControlPlane({
    isRecording: true,
    captureMode: mode,
    captureCursor,
    activeSessionId: sessionId,
    recordingStartedAt: Date.now(),
    activeTabId: targetTabId,
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
  await broadcastStateUpdate();

  const beginMsg: ExtensionMessage = {
    type: "BEGIN_CAPTURE",
    payload: { sessionId, mode, captureCursor },
  };
  
  try {
    await chrome.tabs.sendMessage(targetTabId, beginMsg);
  } catch (err) {
    console.error("Failed to send BEGIN_CAPTURE to tab:", err);
    // Graceful fallback: alert the user that the tab needs a refresh
    sendResponse({ error: "Connection failed. Please refresh the target tab and try again." });
    return;
  }

  sendResponse({ sessionId });
}

async function handleStopCapture(): Promise<void> {
  const plane = await getSessionControlPlane();
  if (!plane?.isRecording) return;

  const { activeSessionId, activeTabId } = plane;

  const session = await getSession(activeSessionId);
  if (session) {
    const stepCount = await countStepsBySession(activeSessionId);
    await putSession({ ...session, endedAt: Date.now(), stepCount });
  }

  await clearSessionControlPlane();
  clearBadge();
  await broadcastStateUpdate();

  try {
    const endMsg: ExtensionMessage = { type: "END_CAPTURE" };
    await chrome.tabs.sendMessage(activeTabId, endMsg);
  } catch {
    // Tab likely closed
  }
}

async function handleCaptureVisibleTab(
  sendResponse: (r: any) => void
): Promise<void> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    sendResponse({ buffer });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
}

// —— Cross-domain SSO survival ——————————————————————————————————————————————

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;

  void (async () => {
    const plane = await getSessionControlPlane();
    if (!plane?.isRecording || tabId !== plane.activeTabId) return;

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
      // Content script not yet ready
    }
  })();
});

// —— Tab removal — graceful stop ————————————————————————————————————————————

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const plane = await getSessionControlPlane();
    if (!plane?.isRecording || tabId !== plane.activeTabId) return;

    const session = await getSession(plane.activeSessionId);
    if (session) {
      const stepCount = await countStepsBySession(plane.activeSessionId);
      await putSession({ ...session, endedAt: Date.now(), stepCount });
    }

    await clearSessionControlPlane();
    clearBadge();
    await broadcastStateUpdate();
  })();
});

// —— Extension install / startup ————————————————————————————————————————————

chrome.runtime.onInstalled.addListener(() => {
  clearBadge();
});