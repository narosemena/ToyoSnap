/**
 * CRUD layer for IDB. All blob and rrweb event writes/reads go through
 * idb-crypto.ts transparently. No other module calls idb directly for
 * the "blobs" or rrweb event data  -  they all use this module.
 */
import { getDB } from "@/lib/idb";
import { getOrCreateSessionKey, encrypt, decrypt } from "@/security/idb-crypto";
import type { CaptureSession, CaptureStep, ActionStep } from "@/types/capture";
import type { LedgerEntry } from "@/types/ledger";
import type { DesignSystem } from "@/types/design-system";

// â"€â"€ Sessions â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putSession(session: CaptureSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSession(id: string): Promise<CaptureSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function getAllSessions(): Promise<CaptureSession[]> {
  const db = await getDB();
  return db.getAll("sessions");
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

/** Delete a session and all associated steps, blobs, and design system data. */
export async function purgeSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const steps = await getStepsBySession(sessionId);

  for (const step of steps) {
    if (step.blobId) await db.delete("blobs", step.blobId);
    await db.delete("blobs", `rrweb-${sessionId}-${step.stepIndex}`);
    await db.delete("steps", [sessionId, step.stepIndex]);
  }

  await db.delete("designSystems", sessionId);
  await db.delete("sessions", sessionId);
}

// â"€â"€ Steps â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putStep(step: CaptureStep): Promise<void> {
  const db = await getDB();
  const key = await getOrCreateSessionKey();

  // Encrypt rrweb events if present
  let encryptedStep = { ...step };
  if (step.rrwebEvents !== null) {
    const encoded = new TextEncoder().encode(JSON.stringify(step.rrwebEvents));
    const encryptedBuf = await encrypt(key, encoded.buffer);
    // Store encrypted bytes as base64 string to keep IDB schema clean
    encryptedStep = {
      ...step,
      rrwebEvents: null, // replaced by encrypted blob
      blobId: step.blobId, // preserve original blobId
    } as CaptureStep;
    // Store encrypted rrweb data in blobs store under a derived key
    await db.put("blobs", encryptedBuf, `rrweb-${step.sessionId}-${step.stepIndex}`);
  }

  await db.put("steps", encryptedStep);
}

export async function getStep(
  sessionId: string,
  stepIndex: number
): Promise<CaptureStep | undefined> {
  const db = await getDB();
  const step = await db.get("steps", [sessionId, stepIndex]);
  if (!step) return undefined;

  const encryptedRrweb = await db.get("blobs", `rrweb-${sessionId}-${stepIndex}`);
  if (encryptedRrweb) {
    const key = await getOrCreateSessionKey();
    const decrypted = await decrypt(key, encryptedRrweb);
    const json = new TextDecoder().decode(decrypted);
    return { ...step, rrwebEvents: JSON.parse(json) as CaptureStep["rrwebEvents"] };
  }

  return step;
}

export async function getStepsBySession(sessionId: string): Promise<CaptureStep[]> {
  const db = await getDB();
  const all = await db.getAll("steps");
  return all.filter((s) => s.sessionId === sessionId).sort((a, b) => a.stepIndex - b.stepIndex);
}

export async function countStepsBySession(sessionId: string): Promise<number> {
  const steps = await getStepsBySession(sessionId);
  return steps.length;
}

// â"€â"€ Blobs (encrypted at rest) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putBlob(blobId: string, data: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const key = await getOrCreateSessionKey();
  const encrypted = await encrypt(key, data);
  await db.put("blobs", encrypted, blobId);
}

export async function getBlob(blobId: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB();
  const encrypted = await db.get("blobs", blobId);
  if (!encrypted) return undefined;
  const key = await getOrCreateSessionKey();
  return decrypt(key, encrypted);
}

export async function deleteBlob(blobId: string): Promise<void> {
  const db = await getDB();
  await db.delete("blobs", blobId);
}

// â"€â"€ Global Ledger â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putGlobalLedgerEntry(entry: LedgerEntry): Promise<void> {
  const db = await getDB();
  await db.put("globalLedger", entry);
}

export async function getGlobalLedgerEntry(id: string): Promise<LedgerEntry | undefined> {
  const db = await getDB();
  return db.get("globalLedger", id);
}

export async function getAllGlobalLedgerEntries(): Promise<LedgerEntry[]> {
  const db = await getDB();
  return db.getAll("globalLedger");
}

export async function deleteGlobalLedgerEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("globalLedger", id);
}

// â"€â"€ Local Ledger â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putLocalLedgerEntry(
  sessionId: string,
  stepId: string,
  entry: LedgerEntry
): Promise<void> {
  const db = await getDB();
  // Region ops have no selector/rrwebId — use entry.id to prevent overwrite.
  const rrwebId = entry.rrwebId ?? (entry.elementSelector || entry.id);
  const storedEntry = { ...entry, sessionId, stepId, rrwebId };
  await db.put("localLedger", storedEntry as unknown as LedgerEntry);
}

export async function getLocalLedgerEntry(
  sessionId: string,
  stepId: string,
  rrwebId: string
): Promise<LedgerEntry | undefined> {
  const db = await getDB();
  return db.get("localLedger", [sessionId, stepId, rrwebId]);
}

/** Returns all local ledger entries for a given session (any step). */
export async function getLocalLedgerEntriesBySession(sessionId: string): Promise<LedgerEntry[]> {
  const db = await getDB();
  return db.getAll(
    "localLedger",
    IDBKeyRange.bound([sessionId], [sessionId, "\uffff", "\uffff"])
  ) as unknown as LedgerEntry[];
}

// â"€â"€ Design Systems â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putDesignSystem(ds: DesignSystem): Promise<void> {
  const db = await getDB();
  await db.put("designSystems", ds);
}

export async function getDesignSystem(sessionId: string): Promise<DesignSystem | undefined> {
  const db = await getDB();
  return db.get("designSystems", sessionId);
}

// â"€â"€ Action Logs â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function putActionLog(sessionId: string, steps: ActionStep[]): Promise<void> {
  const db = await getDB();
  await db.put("actionLogs", steps, sessionId);
}

export async function getActionLog(sessionId: string): Promise<ActionStep[] | undefined> {
  const db = await getDB();
  return db.get("actionLogs", sessionId);
}
