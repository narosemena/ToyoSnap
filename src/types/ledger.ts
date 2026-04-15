export type PIIOperationType = "blur" | "redact";

export interface LedgerEntry {
  id: string;
  operationType: PIIOperationType;
  rrwebId: string | null;
  elementSelector: string;
  applyGlobally: boolean;
  replacementText: string;
  createdAt: number;
  updatedAt: number;
}
