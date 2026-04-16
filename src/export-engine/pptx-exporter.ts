import PptxGenJS from "pptxgenjs";
import {
  getStepsBySession,
  getAllGlobalLedgerEntries,
  getLocalLedgerEntriesBySession,
} from "@/storage/ephemeral-db";
import { compositeStepToPng, toBase64Chunked } from "./composite-step";

export async function exportPptx(sessionId: string): Promise<Blob> {
  const [steps, globalOps, localOps] = await Promise.all([
    getStepsBySession(sessionId),
    getAllGlobalLedgerEntries(),
    getLocalLedgerEntriesBySession(sessionId),
  ]);
  const allOps = [...globalOps, ...localOps];

  const pptx = new PptxGenJS();

  for (const step of steps) {
    const slide = pptx.addSlide();

    slide.addText(`Step ${step.stepIndex}: ${step.pageTitle}`, {
      x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 18, bold: true,
    });
    slide.addText(step.url, {
      x: 0.5, y: 0.85, w: 9, h: 0.3, fontSize: 9, color: "888888",
    });

    if (step.blobId) {
      const buffer = await compositeStepToPng(step, allOps);
      if (buffer) {
        // Chunked btoa avoids call-stack overflow for large images
        const base64 = toBase64Chunked(buffer);
        slide.addImage({ data: `image/png;base64,${base64}`, x: 0.5, y: 1.3, w: 9, h: 4.5 });
      }
    }

    if (step.actionStep) {
      slide.addText(step.actionStep.generatedText, {
        x: 0.5, y: 6.0, w: 9, h: 0.5, fontSize: 11, italic: true, color: "444444",
      });
    }
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
