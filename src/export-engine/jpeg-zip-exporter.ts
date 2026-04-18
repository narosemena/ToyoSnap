import JSZip from "jszip";
import {
  getStepsBySession,
  getAllGlobalLedgerEntries,
  getLocalLedgerEntriesBySession,
} from "@/storage/ephemeral-db";
import { compositeStepToJpeg } from "./composite-step";

export async function exportJpegZip(sessionId: string): Promise<Blob> {
  const [steps, globalOps, localOps] = await Promise.all([
    getStepsBySession(sessionId),
    getAllGlobalLedgerEntries(),
    getLocalLedgerEntriesBySession(sessionId),
  ]);
  const allOps = [...globalOps, ...localOps];
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;
    const buffer = await compositeStepToJpeg(step, allOps);
    if (!buffer) continue;
    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.jpg`;
    zip.file(filename, buffer);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
