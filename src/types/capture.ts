import type { eventWithTime } from "rrweb/typings/types";

export type CaptureMode = "video" | "image-chain" | "rrweb" | "svg";

export interface SvgTextElement {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  tag: string;
}

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
}

export interface CaptureStep {
  sessionId: string;
  stepIndex: number;
  timestamp: number;
  url: string;
  pageTitle: string;
  blobId: string | null;
  rrwebEvents: eventWithTime[] | null;
  actionStep: ActionStep | null;
  spotlightSelector: string | null;
}
