/**
 * Image-chain capture mode.
 * On each user click, sends CAPTURE_IMAGE_STEP to the SW which calls
 * chrome.tabs.captureVisibleTab (SW-only API) and stores blob + step in the
 * extension-origin IDB. Content scripts cannot write to extension-origin IDB.
 */
import type { BaseCapture } from "./base-capture";
import { hideOverlay, showOverlay } from "../content/recording-overlay";

export class ImageCapture implements BaseCapture {
  private sessionId: string;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.clickHandler = (e: MouseEvent) => void this.onUserClick(e);
    document.addEventListener("click", this.clickHandler, { capture: true, passive: true });
    
    // Capture initial frame. Delay to ensure page has rendered.
    // Minimum 1000ms as requested to avoid blank screens.
    const delay = document.readyState === "complete" ? 1000 : 2000;
    setTimeout(() => void this.triggerCapture(), delay);
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    // 1 click equals 2 captures:
    // 1. Capture the current screen IMMEDIATELY (before the click processes)
    void this.triggerCapture();

    // 2. Capture the next screen after a delay (allowing page load/state change)
    // Set to 2000ms as requested to ensure stable UI rendering.
    setTimeout(() => void this.triggerCapture(), 2000);
  }

  private async triggerCapture(): Promise<void> {
    if (!chrome.runtime?.id) {
      console.warn("[ToyoSnap Image] Extension context invalidated, stopping capture.");
      return;
    }
    
    // Hide overlay so it's not captured in the screenshot
    hideOverlay();
    
    // Slight delay to allow DOM to flush the hidden state before capturing
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    try {
      await chrome.runtime.sendMessage({
        type: "CAPTURE_IMAGE_STEP",
        payload: {
          sessionId: this.sessionId,
          url: location.href,
          pageTitle: document.title,
        },
      });
    } finally {
      // Restore overlay after capture completes or fails
      showOverlay();
    }
  }

  async captureStep(_stepIndex: number): Promise<void> {
    // Already handled by click listener and start()
  }
}
