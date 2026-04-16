import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
} from "docx";
import { getStepsBySession, getBlob } from "@/storage/ephemeral-db";

export async function exportDocx(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: `ToyoSnap Workflow  -  Session ${sessionId}`,
      heading: HeadingLevel.TITLE,
    })
  );

  for (const step of steps) {
    children.push(
      new Paragraph({
        text: `Step ${step.stepIndex}: ${step.pageTitle}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        children: [new TextRun({ text: step.url, color: "888888", size: 18 })],
      })
    );

    if (step.blobId) {
      const buffer = await getBlob(step.blobId);
      if (buffer) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width: 600, height: 338 },
                type: "png",
              }),
            ],
          })
        );
      }
    }

    if (step.actionStep) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: step.actionStep.generatedText, italics: true })],
        })
      );
    }

    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
