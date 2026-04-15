import type { CaptureMode } from "./capture";
import type { DesignSystem } from "./design-system";

export interface MCPStep {
  index: number;
  timestamp: number;
  url: string;
  pageTitle: string;
  action: string;
  captureMode: CaptureMode;
  hasBlur: boolean;
  hasRedaction: boolean;
}

export interface MCPLog {
  schemaVersion: "1.0";
  sessionId: string;
  exportedAt: number;
  steps: MCPStep[];
  designSystem: DesignSystem | null;
  actionLogText: string;
}
