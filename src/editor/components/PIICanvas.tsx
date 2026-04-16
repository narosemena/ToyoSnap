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

const LS_BLUR = "toyosnap_blur_settings";
const LS_REDACT = "toyosnap_redact_settings";

const BLUR_PRESETS = [
  { label: "Light", radius: 4 },
  { label: "Medium", radius: 8 },
  { label: "Heavy", radius: 16 },
] as const;

// ——— Inline settings dialogs ——————————————————————————————————————————————

function BlurSettingsDialog({
  current,
  onConfirm,
  onCancel,
}: {
  current: { radius: number };
  onConfirm: (s: { radius: number }) => void;
  onCancel: () => void;
}) {
  const [radius, setRadius] = useState(current.radius);
  return (
    <div className="mt-2 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Blur intensity</p>
      <div className="flex gap-2">
        {BLUR_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setRadius(p.radius)}
            className={[
              "flex-1 py-1.5 rounded text-xs font-medium transition-colors",
              radius === p.radius
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm({ radius })}
          className="flex-1 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function RedactSettingsDialog({
  current,
  onConfirm,
  onCancel,
}: {
  current: { color: string; label: string };
  onConfirm: (s: { color: string; label: string }) => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState(current.color);
  const [label, setLabel] = useState(current.label);
  return (
    <div className="mt-2 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 space-y-3">
      <p className="text-xs font-semibold text-red-700 dark:text-red-300">Redact settings</p>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400 shrink-0">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          aria-label="Redaction fill color"
        />
        <span className="text-xs font-mono text-gray-500">{color}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400 shrink-0">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
          placeholder="[REDACTED]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm({ color, label })}
          className="flex-1 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 font-medium"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ——— Gear icon SVG ————————————————————————————————————————————————————————

function GearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 5a3 3 0 100 6A3 3 0 008 5zM6.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
      <path d="M8 0a.75.75 0 01.75.75v1.22a5.5 5.5 0 012.44 1.01l.86-.86a.75.75 0 111.06 1.06l-.86.86A5.5 5.5 0 0113.03 6.25h1.22a.75.75 0 010 1.5h-1.22a5.5 5.5 0 01-1.01 2.44l.86.86a.75.75 0 11-1.06 1.06l-.86-.86A5.5 5.5 0 018.75 13.03v1.22a.75.75 0 01-1.5 0v-1.22a5.5 5.5 0 01-2.44-1.01l-.86.86a.75.75 0 01-1.06-1.06l.86-.86A5.5 5.5 0 012.97 8.75H1.75a.75.75 0 010-1.5h1.22A5.5 5.5 0 014.08 4.81l-.86-.86a.75.75 0 011.06-1.06l.86.86A5.5 5.5 0 017.25 1.97V.75A.75.75 0 018 0z"/>
    </svg>
  );
}

// ——— Tool toggle with gear ————————————————————————————————————————————————

function ToolToggle({
  tool: _tool,
  label,
  active,
  onToggle,
  onGear,
}: {
  tool: "blur" | "redact";
  label: string;
  active: boolean;
  onToggle: () => void;
  onGear: () => void;
}) {
  return (
    <div className="flex items-stretch rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={[
          "px-3 py-1.5 text-sm font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
          active
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
        ].join(" ")}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onGear(); }}
        aria-label={`${label} settings`}
        className={[
          "px-1.5 border-l transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
          active
            ? "border-blue-500 bg-blue-700 text-blue-100 hover:bg-blue-800"
            : "border-gray-300 dark:border-gray-600 bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600",
        ].join(" ")}
      >
        <GearIcon />
      </button>
    </div>
  );
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

// ——— Main component ———————————————————————————————————————————————————————

export function PIICanvas({ step }: PIICanvasProps) {
  const {
    activeTool, setActiveTool, activeSessionId,
    blurSettings, redactSettings, setBlurSettings, setRedactSettings,
  } = useEditorStore();
  const { applyOperation, undo, redo, appliedOperations, undoStack, redoStack } = usePIIStore();
  const [scope, setScope] = useState<"local" | "global">("local");
  const [customSelector, setCustomSelector] = useState("");
  const [showBlurDialog, setShowBlurDialog] = useState(false);
  const [showRedactDialog, setShowRedactDialog] = useState(false);

  if (!step || !activeSessionId) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        Select a step to apply PII redactions.
      </div>
    );
  }

  function handleBlurToggle() {
    // First-time: no saved settings yet → show dialog instead of activating
    if (!localStorage.getItem(LS_BLUR)) {
      setShowBlurDialog(true);
      return;
    }
    setActiveTool(activeTool === "blur" ? null : "blur");
    setShowBlurDialog(false);
  }

  function handleBlurGear() {
    setShowBlurDialog((v) => !v);
    setShowRedactDialog(false);
  }

  function confirmBlur(s: { radius: number }) {
    setBlurSettings(s);
    setShowBlurDialog(false);
    setActiveTool("blur");
  }

  function handleRedactToggle() {
    if (!localStorage.getItem(LS_REDACT)) {
      setShowRedactDialog(true);
      return;
    }
    setActiveTool(activeTool === "redact" ? null : "redact");
    setShowRedactDialog(false);
  }

  function handleRedactGear() {
    setShowRedactDialog((v) => !v);
    setShowBlurDialog(false);
  }

  function confirmRedact(s: { color: string; label: string }) {
    setRedactSettings(s);
    setShowRedactDialog(false);
    setActiveTool("redact");
  }

  // Candidate regions from action metadata
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
      blurRadius: activeTool === "blur" ? blurSettings.radius : null,
      redactColor: activeTool === "redact" ? redactSettings.color : null,
      applyGlobally: scope === "global",
      replacementText: activeTool === "redact" ? redactSettings.label : "",
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

  // Applied ops scoped to current step (region ops) or any step (selector ops)
  const stepOps = appliedOperations.filter(
    (op) => op.stepIndex == null || op.stepIndex === step.stepIndex
  );

  return (
    <section aria-label="PII redaction canvas">
      {/* Tool bar */}
      <div className="space-y-2 mb-3">
        {/* Row 1: Tool buttons + Undo/Redo */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Tool:</span>
          <ToolToggle
            tool="blur"
            label="Blur"
            active={activeTool === "blur"}
            onToggle={handleBlurToggle}
            onGear={handleBlurGear}
          />
          <ToolToggle
            tool="redact"
            label="Redact"
            active={activeTool === "redact"}
            onToggle={handleRedactToggle}
            onGear={handleRedactGear}
          />
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

        {/* Blur settings dialog */}
        {showBlurDialog && (
          <BlurSettingsDialog
            current={blurSettings}
            onConfirm={confirmBlur}
            onCancel={() => setShowBlurDialog(false)}
          />
        )}

        {/* Redact settings dialog */}
        {showRedactDialog && (
          <RedactSettingsDialog
            current={redactSettings}
            onConfirm={confirmRedact}
            onCancel={() => setShowRedactDialog(false)}
          />
        )}

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
      {activeTool && !showBlurDialog && !showRedactDialog && (
        <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <strong className="font-semibold capitalize">{activeTool} active.</strong>{" "}
          {activeTool === "blur"
            ? `Intensity: ${BLUR_PRESETS.find((p) => p.radius === blurSettings.radius)?.label ?? "Custom"}. `
            : `Color: ${redactSettings.color}. `}
          Drag a region over the preview to apply.
        </div>
      )}

      {/* Candidate regions (selector-based — DOM mode) */}
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

      {/* Applied operations — scoped to current step */}
      {stepOps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Applied on this step ({stepOps.length})
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {stepOps.map((op) => (
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
