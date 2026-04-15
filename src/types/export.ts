export type ExportFormat =
  | "video"
  | "png-zip"
  | "svg-zip"
  | "html-replay"
  | "action-log"
  | "markdown"
  | "pptx"
  | "docx"
  | "mcp-json";

export interface ExportJob {
  sessionId: string;
  format: ExportFormat;
  startedAt: number;
  completedAt: number | null;
  blobUrl: string | null;
  error: string | null;
}
