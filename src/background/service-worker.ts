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
  putBlob,
  putDesignSystem,
  getStepsBySession,
  getAllSessions,
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
  const msg = {
    type: "SESSION_UPDATED",
    payload: plane || { isRecording: false },
  };

  // 1. Broadcast to extension UI (Popup, Studio)
  chrome.runtime.sendMessage(msg).catch(() => {});

  // 2. Broadcast to the active tab (Recording Overlay)
  if (plane?.activeTabId) {
    chrome.tabs.sendMessage(plane.activeTabId, msg).catch(() => {});
  }
}

// —— Message handler ————————————————————————————————————————————————————————

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r: any) => void) => {
    if (!isValidSender(sender)) return; 

    const msg = rawMsg as ExtensionMessage;

    switch (msg.type) {
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

      case "START_CAPTURE":
        void handleStartCapture(
          msg.payload.mode,
          msg.payload.captureCursor,
          sender,
          sendResponse,
          msg.payload.imageFormat
        );
        return true;

      case "STOP_CAPTURE":
        void handleStopCapture();
        sendResponse({ status: "stopping" });
        break;

      case "TOGGLE_CAPTURE":
        void handleToggleCapture();
        sendResponse({ ok: true });
        break;

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

      case "TRIGGER_CAPTURE_VISIBLE_TAB":
        void handleCaptureVisibleTab(sendResponse);
        return true;

      case "RRWEB_BATCH": {
        const { sessionId, events, url, pageTitle } = msg.payload;
        if (events?.length) {
          void (async () => {
            try {
              const stepIndex = (await countStepsBySession(sessionId)) + 1;
              const step: CaptureStep = {
                sessionId,
                stepIndex,
                timestamp: Date.now(),
                url: url ?? "",
                pageTitle: pageTitle ?? "",
                blobId: null,
                rrwebEvents: events as CaptureStep["rrwebEvents"],
                actionStep: null,
                spotlightSelector: null,
              };
              await putStep(step);
              const hasSession = await getSessionControlPlane();
              if (hasSession && hasSession.activeSessionId === sessionId) {
                await setSessionControlPlane({
                  stepCount: stepIndex,
                  activeTabId: sender.tab?.id ?? hasSession.activeTabId,
                });
                await broadcastStateUpdate();
              }
            } catch (err) {
              if (import.meta.env.DEV) {
                console.error("[ToyoSnap SW] RRWEB_BATCH failed:", err);
              }
            }
          })();
        }
        sendResponse({ ok: true });
        break;
      }

      case "CAPTURE_IMAGE_STEP": {
        // Content scripts cannot write to the extension-origin IDB.
        // SW captures the screenshot and stores blob + step directly.
        void (async () => {
          const { sessionId, url, pageTitle } = msg.payload;
          try {
            const session = await getSession(sessionId);
            const fmt: "png" | "jpeg" = session?.imageFormat === "jpeg" ? "jpeg" : "png";
            const captureOpts: chrome.tabs.CaptureVisibleTabOptions = { format: fmt };
            if (fmt === "jpeg") captureOpts.quality = 92;
            const dataUrl = await chrome.tabs.captureVisibleTab(captureOpts);
            // Decode base64 directly — fetch(data:...) violates connect-src 'self' CSP.
            const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const buffer = bytes.buffer;
            const blobId = crypto.randomUUID();
            await putBlob(blobId, buffer);
            const stepIndex = (await countStepsBySession(sessionId)) + 1;
            const mimeType = fmt === "jpeg" ? "image/jpeg" : "image/png";
            const step: CaptureStep = {
              sessionId, stepIndex, timestamp: Date.now(),
              url, pageTitle, blobId, mimeType,
              rrwebEvents: null, actionStep: null, spotlightSelector: null,
            };
            await putStep(step);
            // Update step count and ensure we're targeting the correct tab for broadcasts
            const hasSession = await getSessionControlPlane();
            if (hasSession && hasSession.activeSessionId === sessionId) {
              await setSessionControlPlane({ 
                stepCount: stepIndex,
                activeTabId: sender.tab?.id ?? hasSession.activeTabId 
              });
              await broadcastStateUpdate();
            }
            sendResponse({ ok: true });
          } catch (err) {
            sendResponse({ error: String(err) });
          }
        })();
        return true;
      }


      case "STORE_BLOB_STEP": {
        // SVG and video captures generate binary in the content script context.
        // Transfer via base64 and store in extension-origin IDB here in the SW.
        void (async () => {
          const { sessionId, url, pageTitle, base64, mimeType: payloadMime } = msg.payload;
          try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const buffer = bytes.buffer;
            const blobId = crypto.randomUUID();
            await putBlob(blobId, buffer);
            const stepIndex = (await countStepsBySession(sessionId)) + 1;
            const step: CaptureStep = {
              sessionId, stepIndex, timestamp: Date.now(),
              url, pageTitle, blobId, mimeType: payloadMime,
              rrwebEvents: null, actionStep: null, spotlightSelector: null,
            };
            await putStep(step);
            // Update step count and ensure we're targeting the correct tab for broadcasts
            const hasSession = await getSessionControlPlane();
            if (hasSession && hasSession.activeSessionId === sessionId) {
              await setSessionControlPlane({ 
                stepCount: stepIndex,
                activeTabId: sender.tab?.id ?? hasSession.activeTabId 
              });
              await broadcastStateUpdate();
            }
            sendResponse({ ok: true });
          } catch (err) {
            sendResponse({ error: String(err) });
          }
        })();
        return true;
      }

      case "EXPORT_SESSION_DATA": {
        void (async () => {
          try {
            const { sessionId } = msg.payload;
            const steps = await getStepsBySession(sessionId);
            sendResponse({ steps });
          } catch (err) {
            sendResponse({ error: String(err) });
          }
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

      case "DESIGN_SYSTEM_SAVED": {
        void (async () => {
          const { designSystem } = msg.payload;
          if (designSystem) await putDesignSystem(designSystem);
        })();
        break;
      }

      default:
        if (import.meta.env.DEV) {
          console.warn("[ToyoSnap SW] unhandled message type:", msg.type);
        }
    }
  }
);

async function handleStartCapture(
  mode: CaptureMode,
  captureCursor: boolean,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: any) => void = () => {},
  imageFormat?: "png" | "jpeg"
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
    stepCount: 0,
  });

  const session: CaptureSession = {
    id: sessionId,
    mode,
    startedAt: Date.now(),
    endedAt: null,
    stepCount: 0,
    captureCursor,
    hostnames: [],
    ...(mode === "image-chain" ? { imageFormat: imageFormat ?? "png" } : {}),
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

  // Auto-open the editor vault so the user lands directly on their recording
  const editorUrl = chrome.runtime.getURL("src/editor/editor.html") +
    `?session=${activeSessionId}`;
  await chrome.tabs.create({ url: editorUrl });
}

async function handleCaptureVisibleTab(
  sendResponse: (r: any) => void
): Promise<void> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    sendResponse({ buffer: bytes.buffer });
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

chrome.runtime.onInstalled.addListener(({ reason }) => {
  clearBadge();
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome/welcome.html') });
  }
});

// —— Keyboard shortcut ——————————————————————————————————————————————————————

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-capture') void handleToggleCapture();
});

async function handleToggleCapture(): Promise<void> {
  const plane = await getSessionControlPlane();
  if (plane?.isRecording) {
    await handleStopCapture();
    return;
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;
  const stored = await chrome.storage.local.get('toyosnap_shortcut_mode');
  const mode = (stored['toyosnap_shortcut_mode'] as CaptureMode) ?? 'image-chain';
  await handleStartCapture(mode, false, { tab: activeTab } as chrome.runtime.MessageSender);
}