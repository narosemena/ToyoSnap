import { getStepsBySession, getDesignSystem, getActionLog } from "@/storage/ephemeral-db";
import type { MCPLog, MCPStep } from "@/types/mcp";
import { getAllGlobal } from "@/ledger/global-ledger";

export async function exportMCP(sessionId: string): Promise<Blob> {
  const [steps, ds, actionLog, globalLedger] = await Promise.all([
    getStepsBySession(sessionId),
    getDesignSystem(sessionId),
    getActionLog(sessionId),
    getAllGlobal(),
  ]);

  const mcpSteps: MCPStep[] = steps.map((step) => {
    const rrwebId = step.actionStep?.targetRrwebId;
    const hasLedgerEntry = rrwebId
      ? globalLedger.some((e) => e.rrwebId === rrwebId)
      : false;

    return {
      index: step.stepIndex,
      timestamp: step.timestamp,
      url: step.url,
      pageTitle: step.pageTitle,
      action: step.actionStep?.generatedText ?? "(no action)",
      captureMode: ds ? ("rrweb" as const) : ("image-chain" as const),
      hasBlur: hasLedgerEntry && globalLedger.some((e) => e.rrwebId === rrwebId && e.operationType === "blur"),
      hasRedaction: hasLedgerEntry && globalLedger.some((e) => e.rrwebId === rrwebId && e.operationType === "redact"),
    };
  });

  const actionLogText = (actionLog ?? [])
    .map((a) => `${a.stepIndex}. ${a.generatedText}`)
    .join("\n");

  const log: MCPLog = {
    schemaVersion: "1.0",
    sessionId,
    exportedAt: Date.now(),
    steps: mcpSteps,
    designSystem: ds ?? null,
    actionLogText,
  };

  return new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
}
