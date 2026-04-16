/**
 * SVG ZIP exporter — exports raw SVG blobs with no overlay compositing.
 * SVG captures are vector files; privacy redactions are applied downstream
 * in a dedicated SVG editor (Inkscape, Illustrator, Figma, etc.).
 */
import JSZip from "jszip";
import { getStepsBySession, getBlob } from "@/storage/ephemeral-db";

export async function exportSvgZip(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;
    const buffer = await getBlob(step.blobId);
    if (!buffer) continue;
    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.svg`;
    zip.file(filename, buffer);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
