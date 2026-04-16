import JSZip from "jszip";
import {
  getStepsBySession,
  getBlob,
  getAllGlobalLedgerEntries,
  getLocalLedgerEntriesBySession,
} from "@/storage/ephemeral-db";
import { compositeStepToSvgBytes } from "./composite-step";

export async function exportSvgZip(sessionId: string): Promise<Blob> {
  const [steps, globalOps, localOps] = await Promise.all([
    getStepsBySession(sessionId),
    getAllGlobalLedgerEntries(),
    getLocalLedgerEntriesBySession(sessionId),
  ]);
  const allOps = [...globalOps, ...localOps];
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;
    const buffer = await getBlob(step.blobId);
    if (!buffer) continue;
    const composited = compositeStepToSvgBytes(buffer, step, allOps);
    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.svg`;
    zip.file(filename, composited);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
