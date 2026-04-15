import { getStepsBySession } from "@/storage/ephemeral-db";

export async function exportActionLog(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);
  const lines: string[] = [`# ToyoSnap Action Log`, `Session: ${sessionId}`, ``];

  for (const step of steps) {
    if (!step.actionStep) continue;
    const { actionStep } = step;
    lines.push(
      `${actionStep.stepIndex}. ${actionStep.generatedText}`,
      `   URL: ${step.url}`,
      `   Selector: ${actionStep.targetSelector}`,
      ``
    );
  }

  return new Blob([lines.join("\n")], { type: "text/plain" });
}
