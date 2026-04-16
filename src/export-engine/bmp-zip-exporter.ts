/**
 * BMP ZIP exporter.
 * Each step is composited (PII overlays baked in) then encoded as a 24-bit BMP.
 */
import JSZip from "jszip";
import {
  getStepsBySession,
  getAllGlobalLedgerEntries,
  getLocalLedgerEntriesBySession,
} from "@/storage/ephemeral-db";
import { compositeStepToPng, canvasToBmp } from "./composite-step";

/** Loads a PNG/SVG ArrayBuffer into a canvas and returns it. */
async function bufferToCanvas(buffer: ArrayBuffer, mimeType: string): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1920;
    canvas.height = img.naturalHeight || 1080;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportBmpZip(sessionId: string): Promise<Blob> {
  const [steps, globalOps, localOps] = await Promise.all([
    getStepsBySession(sessionId),
    getAllGlobalLedgerEntries(),
    getLocalLedgerEntriesBySession(sessionId),
  ]);
  const allOps = [...globalOps, ...localOps];
  const zip = new JSZip();

  for (const step of steps) {
    if (!step.blobId) continue;

    // Composite to PNG first (handles overlays + SVG→raster conversion)
    const pngBuffer = await compositeStepToPng(step, allOps);
    if (!pngBuffer) continue;

    // Decode PNG into a canvas so we can read raw pixels for BMP encoding
    const canvas = await bufferToCanvas(pngBuffer, "image/png");
    const bmpBuffer = canvasToBmp(canvas);

    const filename = `step-${String(step.stepIndex).padStart(3, "0")}.bmp`;
    zip.file(filename, bmpBuffer);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
