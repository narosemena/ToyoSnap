import JSZip from "jszip";
import {
  getStepsBySession,
  getAllGlobalLedgerEntries,
  getLocalLedgerEntriesBySession,
} from "@/storage/ephemeral-db";
import { compositeStepToPng } from "./composite-step";

export async function exportPngZip(sessionId: string): Promise<Blob> {
  const [steps, globalOps, localOps] = await Promise.all([
    getStepsBySession(sessionId),
    getAllGlobalLedgerEntries(),
    getLocalLedgerEntriesBySession(sessionId),
  ]);
  const allOps = [...globalOps, ...localOps];
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;
    const buffer = await compositeStepToPng(step, allOps);
    if (!buffer) continue;
    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.png`;
    zip.file(filename, buffer);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
