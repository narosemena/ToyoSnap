/**
 * Thin coordinator that initializes the correct capture engine for
 * the current page. Tracks whether capture is active to make
 * BEGIN_CAPTURE and RESUME_CAPTURE idempotent.
 */
import type { CaptureMode } from "@/types/capture";
import { VideoCapture } from "@/capture/video-capture";
import { ImageCapture } from "@/capture/image-capture";
import { RrwebCapture } from "@/capture/rrweb-capture";
import { SvgCapture } from "@/capture/svg-capture";
import { CursorTracker } from "@/capture/cursor-tracker";
import type { BaseCapture } from "@/capture/base-capture";

let activeEngine: BaseCapture | null = null;
let cursorTracker: CursorTracker | null = null;

export function isCapturing(): boolean {
  return activeEngine !== null;
}

export async function startCapture(
  sessionId: string,
  mode: CaptureMode,
  captureCursor: boolean
): Promise<void> {
  if (activeEngine) return; // idempotent

  switch (mode) {
    case "video":
      activeEngine = new VideoCapture(sessionId);
      break;
    case "image-chain":
      activeEngine = new ImageCapture(sessionId);
      break;
    case "rrweb":
      activeEngine = new RrwebCapture(sessionId);
      break;
    case "svg":
      activeEngine = new SvgCapture(sessionId);
      break;
  }

  await activeEngine.start();

  if (captureCursor) {
    cursorTracker = new CursorTracker();
    cursorTracker.start();
  }
}

export async function stopCapture(): Promise<void> {
  if (!activeEngine) return;
  await activeEngine.stop();
  activeEngine = null;

  cursorTracker?.stop();
  cursorTracker = null;
}
