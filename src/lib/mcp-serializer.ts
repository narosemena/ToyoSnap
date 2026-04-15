/**
 * Serializes a captured session into the MCPLog structured JSON format.
 * Reused by mcp-exporter.ts for the actual file export.
 */
import { getStepsBySession, getDesignSystem } from "@/storage/ephemeral-db";
import { getAllGlobal } from "@/ledger/global-ledger";
import type { MCPLog, MCPStep } from "@/types/mcp";

export async function serializeToMCP(sessionId: string): Promise<MCPLog> {
  const [steps, ds, globalLedger] = await Promise.all([
    getStepsBySession(sessionId),
    getDesignSystem(sessionId),
    getAllGlobal(),
  ]);

  const mcpSteps: MCPStep[] = steps.map((step) => {
    const rrwebId = step.actionStep?.targetRrwebId ?? null;
    const matchingEntries = rrwebId
      ? globalLedger.filter((e) => e.rrwebId === rrwebId)
      : [];

    return {
      index: step.stepIndex,
      timestamp: step.timestamp,
      url: step.url,
      pageTitle: step.pageTitle,
      action: step.actionStep?.generatedText ?? "(no action)",
      captureMode: step.rrwebEvents ? "rrweb" : step.blobId ? "image-chain" : "svg",
      hasBlur: matchingEntries.some((e) => e.operationType === "blur"),
      hasRedaction: matchingEntries.some((e) => e.operationType === "redact"),
    };
  });

  const actionLogText = steps
    .filter((s) => s.actionStep !== null)
    .map((s) => `${s.stepIndex}. ${s.actionStep!.generatedText}`)
    .join("\n");

  return {
    schemaVersion: "1.0",
    sessionId,
    exportedAt: Date.now(),
    steps: mcpSteps,
    designSystem: ds ?? null,
    actionLogText,
  };
}
