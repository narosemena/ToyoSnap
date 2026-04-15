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
} from "@/storage/ephemeral-db";
import type { ExtensionMessage } from "@/types/messages";
import type { CaptureSession, CaptureMode } from "@/types/capture";

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

// —— Crypto Helpers —————————————————————————————————————————————————————————

/**
 * Retrieves or creates a persistent Master Key for AES-GCM operations.
 */
async function getMasterKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get("vault_master_key");
  
  if (stored.vault_master_key) {
    return await crypto.subtle.importKey(
      "jwk",
      stored.vault_master_key,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }

  const newKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const jwk = await crypto.subtle.exportKey("jwk", newKey);
  await chrome.storage.local.set({ vault_master_key: jwk });
  
  return newKey;
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

      case "RRWEB_BATCH":
        void handleEncryptedStorage(msg.payload.events);
        sendResponse({ ok: true });
        break;

      case "EXPORT_SESSION_DATA":
        void handleExportRequest(sendResponse);
        return true;

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

/**
 * —— THE VAULT: ENCRYPTION & STORAGE ————————————————————————————————————————
 */
async function handleEncryptedStorage(events: unknown[]) {
  if (!events || events.length === 0) return;

  const key = await getMasterKey();
  const jsonString = JSON.stringify(events);
  const data = new TextEncoder().encode(jsonString);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  writeToIndexedDB(combined.buffer);
}

function writeToIndexedDB(buffer: ArrayBuffer) {
  // BUMPED VERSION TO 2 to trigger onupgradeneeded
  const req = indexedDB.open("toyosnap", 2);

  req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const db = req.result;
    // If the blobs store already exists, delete it so we can recreate it with autoIncrement
    if (db.objectStoreNames.contains("blobs")) {
      db.deleteObjectStore("blobs");
    }
    db.createObjectStore("blobs", { autoIncrement: true });
    console.log("[ToyoSnap SW] IndexedDB schema updated to v2");
  };

  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("blobs", "readwrite");
    const store = tx.objectStore("blobs");
    store.add(buffer);
  };

  req.onerror = () => console.error("[ToyoSnap SW] IDB Write Error:", req.error);
}

/**
 * —— EXPORT ENGINE: DECRYPTION ——————————————————————————————————————————————
 */
async function handleExportRequest(sendResponse: (r: any) => void) {
  const key = await getMasterKey();
  const req = indexedDB.open("toyosnap", 2);

  req.onsuccess = async () => {
    const db = req.result;
    const tx = db.transaction("blobs", "readonly");
    const store = tx.objectStore("blobs");
    
    const allBlobs = await new Promise<any[]>((resolve) => {
      const getReq = store.getAll();
      getReq.onsuccess = () => resolve(getReq.result);
    });

    const decryptedBatches = [];

    for (const buffer of allBlobs) {
      try {
        const fullData = new Uint8Array(buffer);
        const iv = fullData.slice(0, 12);
        const ciphertext = fullData.slice(12);

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          ciphertext
        );

        const json = new TextDecoder().decode(decrypted);
        decryptedBatches.push(JSON.parse(json));
      } catch (err) {
        console.error("[ToyoSnap Vault] Decryption failed for batch:", err);
      }
    }

    sendResponse({ events: decryptedBatches.flat() });
  };
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
  void getMasterKey();
});