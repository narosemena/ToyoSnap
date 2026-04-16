/**
 * Image-chain capture mode.
 * On each user click, sends CAPTURE_IMAGE_STEP to the SW which calls
 * chrome.tabs.captureVisibleTab (SW-only API) and stores blob + step in the
 * extension-origin IDB. Content scripts cannot write to extension-origin IDB.
 */
import type { BaseCapture } from "./base-capture";

export class ImageCapture implements BaseCapture {
  private sessionId: string;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.clickHandler = (e: MouseEvent) => void this.onUserClick(e);
    document.addEventListener("click", this.clickHandler, { capture: true, passive: true });
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    await chrome.runtime.sendMessage({
      type: "CAPTURE_IMAGE_STEP",
      payload: {
        sessionId: this.sessionId,
        url: location.href,
        pageTitle: document.title,
      },
    });
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.onUserClick(new MouseEvent("click"));
  }
}
