import type { LedgerEntry } from "./ledger";

export interface UndoRecord {
  operationId: string;
  scope: "local" | "global";
  stepId: string | null;
  previousState: LedgerEntry | null;
}
