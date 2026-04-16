import type { BaseCapture } from "./base-capture";

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
    const bytes = new Uint8Array(buffer);
    // btoa can't handle large arrays in one call — chunk it
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    await chrome.runtime.sendMessage({
      type: "STORE_BLOB_STEP",
      payload: {
        sessionId: this.sessionId,
        url: location.href,
        pageTitle: document.title,
        base64,
        mimeType: "video/webm",
      },
    });
  }

  async captureStep(_stepIndex: number): Promise<void> {
    // Video mode captures continuously  -  individual step triggers are no-ops
  }
}
