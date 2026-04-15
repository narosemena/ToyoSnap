import type { LedgerEntry } from "@/types/ledger";
import { putLocalLedgerEntry, getLocalLedgerEntry } from "@/storage/ephemeral-db";

export async function addOrUpdateLocal(
  sessionId: string,
  stepId: string,
  entry: LedgerEntry
): Promise<void> {
  await putLocalLedgerEntry(sessionId, stepId, { ...entry, updatedAt: Date.now() });
}

export async function getLocal(
  sessionId: string,
  stepId: string,
  rrwebId: string
): Promise<LedgerEntry | undefined> {
  return getLocalLedgerEntry(sessionId, stepId, rrwebId);
}
