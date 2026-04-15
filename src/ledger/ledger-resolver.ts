/**
 * Specificity rule: local override wins unconditionally over global.
 *
 * Lookup order per (sessionId, stepId, rrwebId):
 *  1. localLedger[sessionId, stepId, rrwebId] â†’ return if found
 *  2. globalLedger[rrwebId] â†’ return if found
 *  3. null â€” no operation applies
 */
import type { LedgerEntry } from "@/types/ledger";
import { getLocal } from "./local-override-ledger";
import { getAllGlobal } from "./global-ledger";

export async function resolveEntry(
  sessionId: string,
  stepId: string,
  rrwebId: string | null
): Promise<LedgerEntry | null> {
  if (rrwebId) {
    // Step 1: check local override
    const local = await getLocal(sessionId, stepId, rrwebId);
    if (local) return local;

    // Step 2: check global ledger
    const globals = await getAllGlobal();
    const globalMatch = globals.find((e) => e.rrwebId === rrwebId);
    if (globalMatch) return globalMatch;
  }

  // Step 3: no match
  return null;
}
