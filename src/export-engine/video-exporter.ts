import { getStepsBySession } from "@/storage/ephemeral-db";
import { getBlob } from "@/storage/ephemeral-db";

export async function exportVideo(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);
  const videoStep = steps.find((s) => s.blobId !== null && s.rrwebEvents === null);
  if (!videoStep?.blobId) throw new Error("No video data found for session");

  const buffer = await getBlob(videoStep.blobId);
  if (!buffer) throw new Error("Video blob not found in IDB");

  return new Blob([buffer], { type: "video/webm" });
}
