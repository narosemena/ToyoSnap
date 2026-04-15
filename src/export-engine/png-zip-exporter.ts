import JSZip from "jszip";
import { getStepsBySession, getBlob } from "@/storage/ephemeral-db";

export async function exportPngZip(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;
    const buffer = await getBlob(step.blobId);
    if (!buffer) continue;
    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.png`;
    zip.file(filename, buffer);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
