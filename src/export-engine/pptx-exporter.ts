import PptxGenJS from "pptxgenjs";
import { getStepsBySession, getBlob } from "@/storage/ephemeral-db";

export async function exportPptx(sessionId: string): Promise<Blob> {
  const pptx = new PptxGenJS();
  const steps = await getStepsBySession(sessionId);

  for (const step of steps) {
    const slide = pptx.addSlide();

    // Title
    slide.addText(`Step ${step.stepIndex}: ${step.pageTitle}`, {
      x: 0.5,
      y: 0.2,
      w: 9,
      h: 0.6,
      fontSize: 18,
      bold: true,
    });

    // URL breadcrumb
    slide.addText(step.url, { x: 0.5, y: 0.85, w: 9, h: 0.3, fontSize: 9, color: "888888" });

    // Screenshot if available
    if (step.blobId) {
      const buffer = await getBlob(step.blobId);
      if (buffer) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        slide.addImage({ data: `image/png;base64,${base64}`, x: 0.5, y: 1.3, w: 9, h: 4.5 });
      }
    }

    // Action text
    if (step.actionStep) {
      slide.addText(step.actionStep.generatedText, {
        x: 0.5,
        y: 6.0,
        w: 9,
        h: 0.5,
        fontSize: 11,
        italic: true,
        color: "444444",
      });
    }
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
