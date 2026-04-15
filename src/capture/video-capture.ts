import type { BaseCapture } from "./base-capture";
import { putStep, putBlob, countStepsBySession } from "@/storage/ephemeral-db";

export class VideoCapture implements BaseCapture {
  private sessionId: string;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: "video/webm;codecs=vp9" });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(1000); // collect chunks every 1 second
  }

  async stop(): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") return;

    await new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = () => resolve();
      this.mediaRecorder!.stop();
    });

    this.stream?.getTracks().forEach((t) => t.stop());

    const blob = new Blob(this.chunks, { type: "video/webm" });
    const buffer = await blob.arrayBuffer();
    const blobId = crypto.randomUUID();
    await putBlob(blobId, buffer);

    const stepIndex = (await countStepsBySession(this.sessionId)) + 1;
    await putStep({
      sessionId: this.sessionId,
      stepIndex,
      timestamp: Date.now(),
      url: location.href,
      pageTitle: document.title,
      blobId,
      rrwebEvents: null,
      actionStep: null,
      spotlightSelector: null,
    });
  }

  async captureStep(_stepIndex: number): Promise<void> {
    // Video mode captures continuously â€” individual step triggers are no-ops
  }
}
