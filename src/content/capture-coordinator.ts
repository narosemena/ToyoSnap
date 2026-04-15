import { record } from "rrweb";
import type { CaptureMode } from "@/types/capture";

// State Management
let stopFn: (() => void) | null = null;
let eventBuffer: unknown[] = [];
let flushIntervalId: ReturnType<typeof setInterval> | null = null;
let activeSessionId: string | null = null;

// Batching Constants
const FLUSH_INTERVAL_MS = 5000; // Handoff to SW every 5 seconds
const BATCH_SIZE_LIMIT = 500;   // Eager handoff if user acts quickly

export const isCapturing = () => stopFn !== null;

export const startCapture = async (sessionId: string, mode: CaptureMode, captureCursor: boolean) => {
  if (isCapturing()) return;

  activeSessionId = sessionId;
  eventBuffer = []; // Reset local buffer

  // 1. The Observer: Initialize rrweb
  stopFn = record({
    emit(event) {
      // 2. The Buffer: Push to local array instead of immediate send
      eventBuffer.push(event);

      // Eager flush if we hit the limit early
      if (eventBuffer.length >= BATCH_SIZE_LIMIT) {
        flushBuffer();
      }
    },
    // Security Gate: Mask passwords as validated by our Playwright test
    maskInputOptions: {
      password: true,
    },
    recordCanvas: mode === "rrweb",
    // Only capture cursor if requested
    slimDOMOptions: captureCursor ? {} : "all", 
  });

  // 3. The Handoff: Throttle flushes to the Service Worker
  flushIntervalId = setInterval(flushBuffer, FLUSH_INTERVAL_MS);

  // Expose events globally specifically for our password-masking.spec.ts to verify
  (window as Record<string, unknown>).__toyosnap_rrweb_events = eventBuffer;
};

export const stopCapture = async () => {
  if (!isCapturing()) return;

  if (stopFn) {
    stopFn();
    stopFn = null;
  }

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }

  // Final flush to ensure no events are left behind
  flushBuffer();
  activeSessionId = null;
};

const flushBuffer = () => {
  if (eventBuffer.length === 0 || !activeSessionId) return;

  // Clone buffer and clear original immediately to prevent race conditions
  const batch = [...eventBuffer];
  eventBuffer = []; 

  chrome.runtime.sendMessage({
    type: "RRWEB_BATCH",
    payload: {
      sessionId: activeSessionId,
      events: batch
    }
  }).catch(() => {
    // If SW is asleep, Chrome will wake it for the next message.
    // In a strict Zero-Egress environment, we drop rather than fallback to unencrypted local storage.
    console.warn("ToyoSnap: Dropped batch, Service Worker unavailable.");
  });
};