/**
 * Attaches a global click listener during capture to build ActionStep records
 * and append them to IDB.
 */
import type { ActionStep } from "@/types/capture";
import { buildActionStep } from "./action-detector";
import { applySpotlight } from "./spotlight";
import { putStep, countStepsBySession } from "@/storage/ephemeral-db";

export class StepLogBuilder {
  private sessionId: string;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  start(): void {
    this.clickHandler = (e: MouseEvent) => void this.handleClick(e);
    document.addEventListener("click", this.clickHandler, { capture: true, passive: true });
  }

  stop(): void {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private async handleClick(e: MouseEvent): Promise<void> {
    const stepIndex = (await countStepsBySession(this.sessionId)) + 1;
    const actionStep: ActionStep = buildActionStep(e, stepIndex);

    applySpotlight(e.target as Element);

    await putStep({
      sessionId: this.sessionId,
      stepIndex,
      timestamp: actionStep.timestamp,
      url: location.href,
      pageTitle: document.title,
      blobId: null,
      rrwebEvents: null,
      actionStep,
      spotlightSelector: actionStep.targetSelector,
    });

    // Notify SW so it can relay to any open editor via CAPTURE_STEP
    chrome.runtime.sendMessage({
      type: "CAPTURE_STEP",
      payload: { actionStep },
    });
  }
}
