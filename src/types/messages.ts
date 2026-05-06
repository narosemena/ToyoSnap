import type { CaptureMode, ActionStep } from "./capture";

export type ExtensionMessage =
  | { type: "START_CAPTURE"; payload: { mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  | { type: "STOP_CAPTURE" }
  | { type: "BEGIN_CAPTURE"; payload: { sessionId: string; mode: CaptureMode; captureCursor: boolean; imageFormat?: "png" | "jpeg" } }
  | { type: "RESUME_CAPTURE"; payload?: { sessionId: string; captureMode: CaptureMode; captureCursor: boolean } }
  | { type: "END_CAPTURE" }
  | { type: "CAPTURE_STEP"; payload: { actionStep: ActionStep } }
  | { type: "TRIGGER_CAPTURE_VISIBLE_TAB"; payload: { tabId: number } }
  | { type: "GET_TAB_ID" }
  | { type: "RRWEB_BATCH"; payload: { sessionId: string; events: unknown[]; url?: string; pageTitle?: string } }
  | { type: "CAPTURE_IMAGE_STEP"; payload: { sessionId: string; url: string; pageTitle: string } }
  | { type: "STORE_BLOB_STEP"; payload: { sessionId: string; url: string; pageTitle: string; base64: string; mimeType: string } }
  | { type: "EXPORT_SESSION_DATA"; payload: { sessionId: string } }
  | { type: "DESIGN_SYSTEM_SAVED"; payload: { sessionId: string; designSystem?: import("./design-system").DesignSystem } }
  | { type: "PAUSE_CAPTURE" }
  | { type: "GET_SESSION_STATE" };
