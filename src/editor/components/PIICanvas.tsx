import React, { useState } from "react";
import type { CaptureStep } from "@/types/capture";
import type { LedgerEntry } from "@/types/ledger";
import { useEditorStore } from "@/editor/store/editor-store";
import { usePIIStore } from "@/editor/store/pii-store";

interface PIICanvasProps {
  step: CaptureStep | null;
}

interface RegionSelection {
  selector: string;
  label: string;
}

function RegionButton({
  region,
  activeTool,
  isApplied,
  onApply,
}: {
  region: RegionSelection;
  activeTool: "blur" | "redact" | null;
  isApplied: boolean;
  onApply: (region: RegionSelection) => void;
}) {
  const label = activeTool === "blur" ? "Blur" : activeTool === "redact" ? "Redact" : "Select tool";

  return (
    <button
      type="button"
      disabled={!activeTool}
      onClick={() => onApply(region)}
      className={[
        "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-left transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        isApplied
          ? "bg-amber-50 border border-amber-300 dark:bg-amber-900/20 dark:border-amber-600"
          : "bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700",
        !activeTool ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700",
      ].join(" ")}
      aria-pressed={isApplied}
    >
      <span className="flex-1 font-mono text-xs truncate">{region.selector}</span>
      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
        {isApplied ? "Applied" : label}
      </span>
    </button>
  );
}

function ToolToggle({
  tool: _tool,
  label,
  active,
  onToggle,
}: {
  tool: "blur" | "redact";
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={[
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function PIICanvas({ step }: PIICanvasProps) {
  const { activeTool, setActiveTool, activeSessionId } = useEditorStore();
  const { applyOperation, undo, redo, appliedOperations, undoStack, redoStack } = usePIIStore();
  const [scope, setScope] = useState<"local" | "global">("local");
  const [customSelector, setCustomSelector] = useState("");

  if (!step || !activeSessionId) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        Select a step to apply PII redactions.
      </div>
    );
  }

  // Build a list of candidate regions from the actionStep target
  const candidateRegions: RegionSelection[] = [];
  if (step.spotlightSelector) {
    candidateRegions.push({ selector: step.spotlightSelector, label: "Clicked element" });
  }
  if (step.actionStep?.targetSelector && step.actionStep.targetSelector !== step.spotlightSelector) {
    candidateRegions.push({ selector: step.actionStep.targetSelector, label: "Action target" });
  }

  function isApplied(selector: string) {
    return appliedOperations.some((op) => op.elementSelector === selector);
  }

  async function applyToRegion(region: RegionSelection) {
    if (!activeTool || !activeSessionId) return;
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      operationType: activeTool,
      rrwebId: null,
      elementSelector: region.selector,
      applyGlobally: scope === "global",
      replacementText: activeTool === "redact" ? "[REDACTED]" : "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await applyOperation(entry, scope, activeSessionId, String(step!.stepIndex));
  }

  async function applyCustom() {
    const sel = customSelector.trim();
    if (!sel || !activeTool) return;
    await applyToRegion({ selector: sel, label: "Custom" });
    setCustomSelector("");
  }

  return (
    <section aria-label="PII redaction canvas">
      {/* Tool bar — two rows to prevent overflow in narrow panel */}
      <div className="space-y-2 mb-4">
        {/* Row 1: Tool buttons + Undo/Redo */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Tool:</span>
          <ToolToggle
            tool="blur"
            label="Blur"
            active={activeTool === "blur"}
            onToggle={() => setActiveTool(activeTool === "blur" ? null : "blur")}
          />
          <ToolToggle
            tool="redact"
            label="Redact"
            active={activeTool === "redact"}
            onToggle={() => setActiveTool(activeTool === "redact" ? null : "redact")}
          />
          {/* Undo / Redo */}
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={undo}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-label="Undo last operation"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={redo}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-label="Redo last undone operation"
            >
              Redo
            </button>
          </div>
        </div>
        {/* Row 2: Scope selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Scope:</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "local" | "global")}
            className="flex-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
            aria-label="Redaction scope"
          >
            <option value="local">This step only</option>
            <option value="global">All steps</option>
          </select>
        </div>
      </div>

      {/* Active-tool hint */}
      {activeTool && (
        <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <strong className="font-semibold capitalize">{activeTool} active.</strong>{" "}
          For DOM recordings: click any element in the preview. For screenshots: drag a region over the preview.
        </div>
      )}

      {/* Candidate regions */}
      {candidateRegions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Detected elements
          </p>
          <ul className="space-y-1">
            {candidateRegions.map((r) => (
              <li key={r.selector}>
                <RegionButton
                  region={r}
                  activeTool={activeTool}
                  isApplied={isApplied(r.selector)}
                  onApply={(region) => void applyToRegion(region)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Custom selector input */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Custom CSS selector
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSelector}
            onChange={(e) => setCustomSelector(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void applyCustom(); }}
            placeholder="#email, .phone-number, …"
            className="flex-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Custom CSS selector for PII element"
          />
          <button
            type="button"
            disabled={!customSelector.trim() || !activeTool}
            onClick={() => void applyCustom()}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Applied operations summary */}
      {appliedOperations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Applied ({appliedOperations.length})
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {appliedOperations.map((op) => (
              <li
                key={op.id}
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-mono"
              >
                <span className={`px-1 rounded text-xs font-medium ${
                  op.operationType === "blur"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}>
                  {op.operationType}
                </span>
                {op.region ? (
                  <span className="truncate text-gray-500">
                    region {Math.round(op.region.w * 100)}%×{Math.round(op.region.h * 100)}%
                  </span>
                ) : (
                  <span className="truncate">{op.elementSelector}</span>
                )}
                {op.applyGlobally && (
                  <span className="shrink-0 text-gray-400">(global)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
