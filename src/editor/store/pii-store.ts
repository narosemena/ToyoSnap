import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { LedgerEntry } from "@/types/ledger";
import type { UndoRecord } from "@/types/pii";
import { putGlobalLedgerEntry, putLocalLedgerEntry } from "@/storage/ephemeral-db";

interface PIIStore {
  appliedOperations: LedgerEntry[];
  undoStack: UndoRecord[];
  redoStack: UndoRecord[];
  applyOperation: (
    entry: LedgerEntry,
    scope: "local" | "global",
    sessionId: string,
    stepId: string
  ) => Promise<void>;
  undo: () => void;
  redo: () => void;
  loadOperations: (entries: LedgerEntry[]) => void;
  clearStacks: () => void;
}

export const usePIIStore = create<PIIStore>()(
  immer((set, get) => ({
    appliedOperations: [],
    undoStack: [],
    redoStack: [],

    loadOperations: (entries) =>
      set((state) => {
        state.appliedOperations = entries;
      }),

    applyOperation: async (entry, scope, sessionId, stepId) => {
      const existing = get().appliedOperations.find((op) => op.id === entry.id);
      const undoRecord: UndoRecord = {
        operationId: entry.id,
        scope,
        stepId: scope === "local" ? stepId : null,
        previousState: existing ?? null,
      };

      // Persist to IDB
      if (scope === "global" || entry.applyGlobally) {
        await putGlobalLedgerEntry(entry);
      }
      if (scope === "local") {
        await putLocalLedgerEntry(sessionId, stepId, entry);
      }

      set((state) => {
        const idx = state.appliedOperations.findIndex((op) => op.id === entry.id);
        if (idx >= 0) {
          state.appliedOperations[idx] = entry;
        } else {
          state.appliedOperations.push(entry);
        }
        state.undoStack.push(undoRecord);
        state.redoStack = []; // applying clears redo
      });
    },

    undo: () =>
      set((state) => {
        const record = state.undoStack.pop();
        if (!record) return;
        state.redoStack.push(record);
        if (record.previousState === null) {
          state.appliedOperations = state.appliedOperations.filter(
            (op) => op.id !== record.operationId
          );
        } else {
          const idx = state.appliedOperations.findIndex((op) => op.id === record.operationId);
          if (idx >= 0) state.appliedOperations[idx] = record.previousState;
        }
      }),

    redo: () =>
      set((state) => {
        const record = state.redoStack.pop();
        if (!record) return;
        state.undoStack.push(record);
        // Re-apply: we only restore the operation ID reference here
        // The actual IDB write was done in applyOperation — redo is in-memory only
      }),

    clearStacks: () =>
      set((state) => {
        state.undoStack = [];
        state.redoStack = [];
      }),
  }))
);
