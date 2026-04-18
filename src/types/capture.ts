import type { eventWithTime } from "rrweb/typings/types";

export type CaptureMode = "video" | "image-chain" | "rrweb" | "svg";

export interface ActionStep {
  stepIndex: number;
  timestamp: number;
  targetSelector: string;
  targetRrwebId: string | null;
  label: string;
  role: string;
  coordinates: { x: number; y: number };
  generatedText: string;
}

export interface CaptureSession {
  id: string;
  mode: CaptureMode;
  startedAt: number;
  endedAt: number | null;
  stepCount: number;
  captureCursor: boolean;
  hostnames: string[];
  /** Only set for image-chain sessions. Determines capture + export format. */
  imageFormat?: "png" | "jpeg";
}

export interface CaptureStep {
  sessionId: string;
  stepIndex: number;
  timestamp: number;
  url: string;
  pageTitle: string;
  blobId: string | null;
  /** "image/png" | "image/svg+xml" | "video/webm" — null for rrweb steps */
  mimeType?: string | null;
  rrwebEvents: eventWithTime[] | null;
  actionStep: ActionStep | null;
  spotlightSelector: string | null;
}
