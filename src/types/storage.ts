import type { CaptureSession, CaptureStep, ActionStep } from "./capture";
import type { LedgerEntry } from "./ledger";
import type { DesignSystem } from "./design-system";
import type { CaptureMode } from "./capture";

// All ArrayBuffer values in "blobs" and rrweb events in "steps" are
// AES-GCM encrypted via idb-crypto.ts before write; decrypted on read.
// Types here describe the IN-MEMORY shape after decryption.
export interface IDBSchema {
  sessions:      { key: string;                   value: CaptureSession };
  steps:         { key: [string, number];          value: CaptureStep };
  blobs:         { key: string;                   value: ArrayBuffer };
  globalLedger:  { key: string;                   value: LedgerEntry };
  localLedger:   { key: [string, string, string];  value: LedgerEntry };
  designSystems: { key: string;                   value: DesignSystem };
  actionLogs:    { key: string;                   value: ActionStep[] };
}

// Stored in chrome.storage.session — control plane only, never capture data
export interface SessionControlPlane {
  isRecording: boolean;
  captureMode: CaptureMode;
  captureCursor: boolean;
  activeSessionId: string;
  recordingStartedAt: number;
  activeTabId: number;
}
