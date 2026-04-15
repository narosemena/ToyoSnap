/**
 * Capture coordinator — dispatches to the correct engine by mode,
 * mounts CursorTracker and StepLogBuilder for all captures.
 */
import type { CaptureMode } from "@/types/capture";
import type { BaseCapture } from "@/capture/base-capture";
import { RrwebCapture } from "@/capture/rrweb-capture";
import { ImageCapture } from "@/capture/image-capture";
import { VideoCapture } from "@/capture/video-capture";
import { SvgCapture } from "@/capture/svg-capture";
import { CursorTracker } from "@/capture/cursor-tracker";
import { StepLogBuilder } from "@/action-logger/step-log-builder";
import { extractDesignTokens } from "@/lib/design-extractor";
import { detectAntiPatterns } from "@/lib/anti-pattern";
import { getStepsBySession, putDesignSystem } from "@/storage/ephemeral-db";

let engine: BaseCapture | null = null;
let cursorTracker: CursorTracker | null = null;
let stepLogger: StepLogBuilder | null = null;
let activeSessionId: string | null = null;

export const isCapturing = (): boolean => engine !== null;

export const startCapture = async (
  sessionId: string,
  mode: CaptureMode,
  captureCursor: boolean
): Promise<void> => {
  if (isCapturing()) return;

  // Pick the right capture engine
  switch (mode) {
    case "rrweb":
      engine = new RrwebCapture(sessionId);
      break;
    case "image-chain":
      engine = new ImageCapture(sessionId);
      break;
    case "video":
      engine = new VideoCapture(sessionId);
      break;
    case "svg":
      engine = new SvgCapture(sessionId);
      break;
    default:
      engine = new RrwebCapture(sessionId);
  }

  activeSessionId = sessionId;

  // Cursor overlay (optional)
  if (captureCursor) {
    cursorTracker = new CursorTracker();
    cursorTracker.start();
  }

  // Action logger — mode-agnostic
  stepLogger = new StepLogBuilder(sessionId);
  stepLogger.start();

  await engine.start();

  // Expose rrweb events for security tests
  if (mode === "rrweb") {
    (window as Record<string, unknown>).__toyosnap_rrweb_events = [];
  }
};

export const stopCapture = async (): Promise<void> => {
  if (!engine || !activeSessionId) return;

  const sessionId = activeSessionId;

  await engine.stop();
  engine = null;
  activeSessionId = null;

  stepLogger?.stop();
  stepLogger = null;

  cursorTracker?.stop();
  cursorTracker = null;

  // Extract design tokens and detect anti-patterns from live DOM
  const elements = Array.from(document.querySelectorAll("*")).slice(0, 500);
  const { colors, typography, shadows, radii } = extractDesignTokens(elements);
  const steps = await getStepsBySession(sessionId);
  const antiPatterns = detectAntiPatterns(elements, steps.length);
  const pageBreadcrumbs = steps.map((s) => ({
    stepIndex: s.stepIndex,
    url: s.url,
    pageTitle: s.pageTitle,
    urlSlug: new URL(s.url).pathname.replace(/\//g, "-").replace(/^-/, "") || "root",
  }));

  await putDesignSystem({
    sessionId,
    capturedAt: Date.now(),
    colors,
    typography,
    shadows,
    radii,
    antiPatterns,
    pageBreadcrumbs,
  });

  chrome.runtime.sendMessage({ type: "DESIGN_SYSTEM_SAVED", payload: { sessionId } });
};
