import type { SessionControlPlane } from "@/types/storage";

const STORAGE_KEY = "toyosnap_session";

/**
 * Reads the full SessionControlPlane from chrome.storage.session.
 * Returns null if no session is active.
 */
export async function getSessionControlPlane(): Promise<SessionControlPlane | null> {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as SessionControlPlane) ?? null;
}

/**
 * Atomically writes a partial or full SessionControlPlane update.
 * Always uses a single chrome.storage.session.set call to avoid TOCTOU races
 * when multiple tabs are open simultaneously.
 */
export async function setSessionControlPlane(
  update: Partial<SessionControlPlane>
): Promise<void> {
  const current = await getSessionControlPlane();
  const merged = { ...(current ?? {}), ...update } as SessionControlPlane;
  await chrome.storage.session.set({ [STORAGE_KEY]: merged });
}

/**
 * Clears the entire SessionControlPlane from chrome.storage.session.
 * Called on STOP_CAPTURE and Purge Memory.
 */
export async function clearSessionControlPlane(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEY);
}
