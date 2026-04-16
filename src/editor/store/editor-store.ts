import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { CaptureMode } from "@/types/capture";

export interface BlurSettings { radius: number }
export interface RedactSettings { color: string; label: string }

interface EditorStore {
  activeSessionId: string | null;
  activeStepIndex: number;
  activeTool: "blur" | "redact" | null;
  previewMode: CaptureMode;
  isHydrated: boolean;
  exportSensitivityAcknowledged: boolean;
  blurSettings: BlurSettings;
  redactSettings: RedactSettings;
  setActiveSession: (id: string | null) => void;
  setActiveStep: (index: number) => void;
  setActiveTool: (tool: "blur" | "redact" | null) => void;
  setPreviewMode: (mode: CaptureMode) => void;
  setHydrated: (v: boolean) => void;
  acknowledgeExportSensitivity: () => void;
  setBlurSettings: (s: BlurSettings) => void;
  setRedactSettings: (s: RedactSettings) => void;
}

const LS_BLUR = "toyosnap_blur_settings";
const LS_REDACT = "toyosnap_redact_settings";

function loadBlur(): BlurSettings {
  try { const v = localStorage.getItem(LS_BLUR); if (v) return JSON.parse(v) as BlurSettings; } catch {}
  return { radius: 8 };
}
function loadRedact(): RedactSettings {
  try { const v = localStorage.getItem(LS_REDACT); if (v) return JSON.parse(v) as RedactSettings; } catch {}
  return { color: "#000000", label: "[REDACTED]" };
}

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    activeSessionId: null,
    activeStepIndex: 0,
    activeTool: null,
    previewMode: "rrweb",
    isHydrated: false,
    exportSensitivityAcknowledged: false,
    blurSettings: loadBlur(),
    redactSettings: loadRedact(),

    setActiveSession: (id) =>
      set((state) => {
        state.activeSessionId = id;
        state.activeStepIndex = 0;
        state.exportSensitivityAcknowledged = false;
      }),

    setActiveStep: (index) =>
      set((state) => {
        state.activeStepIndex = index;
      }),
    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
      }),
    setPreviewMode: (mode) =>
      set((state) => {
        state.previewMode = mode;
      }),
    setHydrated: (v) =>
      set((state) => {
        state.isHydrated = v;
      }),
    acknowledgeExportSensitivity: () =>
      set((state) => {
        state.exportSensitivityAcknowledged = true;
      }),
    setBlurSettings: (s) => {
      localStorage.setItem(LS_BLUR, JSON.stringify(s));
      set((state) => { state.blurSettings = s; });
    },
    setRedactSettings: (s) => {
      localStorage.setItem(LS_REDACT, JSON.stringify(s));
      set((state) => { state.redactSettings = s; });
    },
  }))
);
