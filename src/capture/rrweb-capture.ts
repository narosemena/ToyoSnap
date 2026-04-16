/**
 * rrweb DOM recording capture mode.
 *
 * SECURITY INVARIANT (do not remove or make conditional):
 *   maskInputOptions.password: true  -  password fields must NEVER be recorded.
 *
 * Pinned to rrweb@1.1.3 stable. See package.json for upgrade path comment.
 *
 * Step boundary: each user click flushes accumulated events as a new step.
 * rrweb emits events synchronously, but we defer the flush by one task tick
 * (setTimeout 0) so rrweb's own click listener fires first and the click
 * event is included in the step being closed, not the next one.
 */
import { record } from "rrweb";
import type { eventWithTime } from "rrweb/typings/types";
import type { BaseCapture } from "./base-capture";

export class RrwebCapture implements BaseCapture {
  private sessionId: string;
  private events: eventWithTime[] = [];
  private stopRecording: (() => void) | null | undefined = null;
  private clickHandler: (() => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.events = [];
    (window as unknown as Record<string, unknown>).__toyosnap_rrweb_events = this.events;

    this.stopRecording = record({
      emit: (event) => {
        this.events.push(event);
      },
      maskInputOptions: {
        password: true, // ALWAYS ON  -  non-negotiable security invariant
        color: false,
        date: false,
      },
      maskTextSelector: undefined,
      blockSelector: "[data-toyosnap-block]",
    });

    // Flush events into a new step on each click.
    // Deferred by one task tick so rrweb records the click event first.
    this.clickHandler = () => {
      setTimeout(() => void this.flushStep(), 0);
    };
    document.addEventListener("click", this.clickHandler, { passive: true });
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }

    if (this.stopRecording) {
      this.stopRecording();
      this.stopRecording = null;
    }

    // Flush any remaining events as the final step
    await this.flushStep();
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.flushStep();
  }

  private async flushStep(): Promise<void> {
    if (this.events.length === 0) return;

    const events = this.events.splice(0); // drain atomically

    // Content scripts run at the host-page origin, not the extension origin.
    // Route writes through the SW so the editor reads from the same IDB.
    await chrome.runtime.sendMessage({
      type: "RRWEB_BATCH",
      payload: {
        sessionId: this.sessionId,
        events,
        url: location.href,
        pageTitle: document.title,
      },
    });
  }
}
