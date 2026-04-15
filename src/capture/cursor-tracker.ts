import { mountCursorOverlay, unmountCursorOverlay } from "@/content/content-cursor-overlay";

export class CursorTracker {
  start(): void {
    mountCursorOverlay();
  }

  stop(): void {
    unmountCursorOverlay();
  }
}
