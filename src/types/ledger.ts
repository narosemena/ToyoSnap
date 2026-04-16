export type PIIOperationType = "blur" | "redact";

export interface LedgerEntry {
  id: string;
  operationType: PIIOperationType;
  rrwebId: string | null;
  /** CSS selector — used for rrweb/DOM-mode redactions */
  elementSelector: string;
  /** Fractional bounding box (0–1) — used for image/video-mode redactions */
  region?: { x: number; y: number; w: number; h: number } | null;
  /** Step this region op belongs to; null/undefined = applies to all steps */
  stepIndex?: number | null;
  /** Blur radius in px (for blur ops on image/SVG steps) */
  blurRadius?: number | null;
  /** Fill color for redact ops on image/SVG steps (hex string) */
  redactColor?: string | null;
  applyGlobally: boolean;
  replacementText: string;
  createdAt: number;
  updatedAt: number;
}
