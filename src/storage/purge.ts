/**
 * Unconditional wipe of all captured data.
 * Called by PurgeMemoryButton after user confirms the destructive action dialog.
 */
import { getDB } from "@/lib/idb";
import { revokeAllBlobUrls } from "./blob-registry";
import { clearSessionKey } from "@/security/idb-crypto";
import { clearSessionControlPlane } from "@/lib/session-store";

export async function purgeAll(): Promise<void> {
  // 1. Revoke all object URLs first (UI refs must be cleared before IDB wipe)
  revokeAllBlobUrls();

  // 2. Wipe all IDB stores
  const db = await getDB();
  const storeNames: Array<
    "sessions" | "steps" | "blobs" | "globalLedger" | "localLedger" | "designSystems" | "actionLogs"
  > = ["sessions", "steps", "blobs", "globalLedger", "localLedger", "designSystems", "actionLogs"];

  const tx = db.transaction(storeNames, "readwrite");
  await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));
  await tx.done;

  // 3. Clear the session encryption key â€” any previously encrypted data is now unreadable
  await clearSessionKey();

  // 4. Clear the SW control plane
  await clearSessionControlPlane();
}

/**
 * Purges a single session and all associated data (steps, blobs, ledger entries, design system).
 * Used for auto-wipe-on-export when the user has opted in.
 */
export async function purgeSession(sessionId: string): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(
    ["sessions", "steps", "blobs", "localLedger", "designSystems", "actionLogs"],
    "readwrite"
  );

  await tx.objectStore("sessions").delete(sessionId);
  await tx.objectStore("designSystems").delete(sessionId);
  await tx.objectStore("actionLogs").delete(sessionId);

  // Delete all steps and their associated blobs for this session
  const allSteps = await tx.objectStore("steps").getAll();
  for (const step of allSteps) {
    if (step.sessionId === sessionId) {
      await tx.objectStore("steps").delete([step.sessionId, step.stepIndex]);
      if (step.blobId) {
        await tx.objectStore("blobs").delete(step.blobId);
        revokeAllBlobUrls();
      }
      // Delete encrypted rrweb blob if stored
      await tx.objectStore("blobs").delete(`rrweb-${step.sessionId}-${step.stepIndex}`);
    }
  }

  await tx.done;
}
