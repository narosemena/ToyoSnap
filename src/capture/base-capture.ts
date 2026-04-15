/**
 * Base interface for all capture engines.
 * Every engine must implement start/stop/captureStep.
 */
export interface BaseCapture {
  start(): Promise<void>;
  stop(): Promise<void>;
  captureStep(stepIndex: number): Promise<void>;
}
