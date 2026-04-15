import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { CaptureMode } from "@/types/capture";

interface EditorStore {
  activeSessionId: string | null;
  activeStepIndex: number;
  activeTool: "blur" | "redact" | null;
  previewMode: CaptureMode;
  isHydrated: boolean;
  exportSensitivityAcknowledged: boolean;
  setActiveSession: (id: string) => void;
  setActiveStep: (index: number) => void;
  setActiveTool: (tool: "blur" | "redact" | null) => void;
  setPreviewMode: (mode: CaptureMode) => void;
  setHydrated: (v: boolean) => void;
  acknowledgeExportSensitivity: () => void;
}

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    activeSessionId: null,
    activeStepIndex: 0,
    activeTool: null,
    previewMode: "rrweb",
    isHydrated: false,
    exportSensitivityAcknowledged: false,

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
  }))
);
