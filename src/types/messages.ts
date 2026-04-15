import type { CaptureMode, ActionStep } from "./capture";

export type ExtensionMessage =
  | { type: "START_CAPTURE"; payload: { mode: CaptureMode; captureCursor: boolean } }
  | { type: "STOP_CAPTURE" }
  | { type: "BEGIN_CAPTURE"; payload: { sessionId: string; mode: CaptureMode; captureCursor: boolean } }
  | { type: "RESUME_CAPTURE"; payload: { sessionId: string; captureMode: CaptureMode; captureCursor: boolean } }
  | { type: "END_CAPTURE" }
  | { type: "CAPTURE_STEP"; payload: { actionStep: ActionStep } }
  | { type: "TRIGGER_CAPTURE_VISIBLE_TAB"; payload: { tabId: number } };
