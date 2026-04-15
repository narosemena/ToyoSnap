/**
 * Image-chain capture mode.
 * On each user click, sends TRIGGER_CAPTURE_VISIBLE_TAB to the SW,
 * which calls chrome.tabs.captureVisibleTab (SW-only API) and responds
 * with the PNG ArrayBuffer.
 */
import type { BaseCapture } from "./base-capture";
import { putStep, putBlob, countStepsBySession } from "@/storage/ephemeral-db";
import type { ExtensionMessage } from "@/types/messages";

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
    const tabId = await this.getTabId();
    if (tabId === null) return;

    const msg: ExtensionMessage = { type: "TRIGGER_CAPTURE_VISIBLE_TAB", payload: { tabId } };

    chrome.runtime.sendMessage(msg, async (response: { buffer?: ArrayBuffer; error?: string }) => {
      if (chrome.runtime.lastError || !response?.buffer) return;

      const blobId = crypto.randomUUID();
      await putBlob(blobId, response.buffer);

      const stepIndex = (await countStepsBySession(this.sessionId)) + 1;
      await putStep({
        sessionId: this.sessionId,
        stepIndex,
        timestamp: Date.now(),
        url: location.href,
        pageTitle: document.title,
        blobId,
        rrwebEvents: null,
        actionStep: null,
        spotlightSelector: null,
      });
    });
  }

  async captureStep(stepIndex: number): Promise<void> {
    await this.onUserClick(new MouseEvent("click"));
    void stepIndex;
  }

  private async getTabId(): Promise<number | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response: { tabId?: number }) => {
        resolve(response?.tabId ?? null);
      });
    });
  }
}
