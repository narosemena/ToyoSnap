/**
 * DOM recording mode — screenshot chain.
 *
 * On each user click the service worker captures the visible tab state as a
 * PNG and stores it as a numbered step. This produces a static image chain
 * triggered automatically on every click.
 *
 * Step boundary: deferred by one task tick (setTimeout 0) so the browser
 * finishes processing the click (state transition, navigation, modal open)
 * before the screenshot is taken.
 *
 * NOTE: The original rrweb event-stream approach was replaced because the
 * rrweb player rendered as a video-like replay, element selection inside the
 * sandboxed replay iframe was unreliable, and static images allow the same
 * drag-to-redact workflow used by all other capture modes.
 *
 * SECURITY NOTE: Password masking is no longer relevant here because we are
 * capturing the rendered visual only (PNG), not DOM text. The browser's own
 * password masking (bullet characters) is preserved in the screenshot.
 */
import type { BaseCapture } from "./base-capture";
import { hideOverlay, showOverlay } from "../content/recording-overlay";

export class RrwebCapture implements BaseCapture {
  private sessionId: string;
  private clickHandler: (() => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.clickHandler = () => {
      setTimeout(() => void this.captureScreenshot(), 0);
    };
    document.addEventListener("click", this.clickHandler, { passive: true });
    // Capture initial screen state so step 1 always exists
    setTimeout(() => void this.captureScreenshot(), 0);
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
    // Capture final window state on recording stop
    await this.captureScreenshot();
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.captureScreenshot();
  }

  private async captureScreenshot(): Promise<void> {
    if (!chrome.runtime?.id) {
      console.warn("[ToyoSnap Rrweb] Extension context invalidated, stopping capture.");
      return;
    }

    hideOverlay();
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
      showOverlay();
    }
  }
}
