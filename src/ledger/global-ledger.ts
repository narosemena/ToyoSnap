import type { LedgerEntry } from "@/types/ledger";
import {
  putGlobalLedgerEntry,
  getGlobalLedgerEntry,
  getAllGlobalLedgerEntries,
  deleteGlobalLedgerEntry,
} from "@/storage/ephemeral-db";

export async function addOrUpdateGlobal(entry: LedgerEntry): Promise<void> {
  await putGlobalLedgerEntry({ ...entry, updatedAt: Date.now() });
}

export async function getGlobal(id: string): Promise<LedgerEntry | undefined> {
  return getGlobalLedgerEntry(id);
}

export async function getAllGlobal(): Promise<LedgerEntry[]> {
  return getAllGlobalLedgerEntries();
}

export async function removeGlobal(id: string): Promise<void> {
  await deleteGlobalLedgerEntry(id);
}
