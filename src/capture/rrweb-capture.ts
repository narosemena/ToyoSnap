/**
 * rrweb DOM recording capture mode.
 *
 * SECURITY INVARIANT (do not remove or make conditional):
 *   maskInputOptions.password: true  -  password fields must NEVER be recorded.
 *
 * Pinned to rrweb@1.1.3 stable. See package.json for upgrade path comment.
 */
import { record } from "rrweb";
import type { eventWithTime } from "rrweb/typings/types";
import type { BaseCapture } from "./base-capture";

export class RrwebCapture implements BaseCapture {
  private sessionId: string;
  private events: eventWithTime[] = [];
  private stopRecording: (() => void) | null | undefined = null;

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
      maskTextSelector: undefined, // user-configurable via popup toggle
      // Pages can opt specific elements out of capture via data-toyosnap-block attribute
      blockSelector: "[data-toyosnap-block]",
    });
  }

  async stop(): Promise<void> {
    if (this.stopRecording) {
      this.stopRecording();
      this.stopRecording = null;
    }

    if (this.events.length === 0) return;

    // Content scripts run at the host-page origin, not the extension origin.
    // IDB writes must go through the service worker (extension origin) so the
    // editor page can read them from the same database.
    await chrome.runtime.sendMessage({
      type: "RRWEB_BATCH",
      payload: {
        sessionId: this.sessionId,
        events: this.events,
        url: location.href,
        pageTitle: document.title,
      },
    });

    this.events = [];
  }

  async captureStep(_stepIndex: number): Promise<void> {
    // rrweb records continuously  -  step captures are handled by action-logger
  }
}
