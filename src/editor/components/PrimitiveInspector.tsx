// src/editor/components/PrimitiveInspector.tsx
import React from "react";
import type { PIIOperationType } from "@/types/ledger";

interface PrimitiveState {
  operationType?: PIIOperationType;
  blurRadius?: number | null;
  pixelCellSize?: number | null;
  redactColor?: string | null;
}

interface Props {
  state: PrimitiveState;
  onChange: (patch: PrimitiveState) => void;
}

const OPS: { value: PIIOperationType; label: string }[] = [
  { value: "blur",     label: "Blur"      },
  { value: "pixelate", label: "Pixelate"  },
  { value: "redact",   label: "Black-bar" },
];

export function PrimitiveInspector({ state, onChange }: Props) {
  const op: PIIOperationType = state.operationType ?? "blur";

  return (
    <div className="flex flex-col gap-3 p-3 border-t border-gray-100 dark:border-gray-800">
      {/* Primitive selector */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Method</p>
        <div className="flex gap-1.5">
          {OPS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ operationType: o.value })}
              className={[
                "flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors",
                op === o.value
                  ? "border-[var(--vs-accent)] bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      {op === "blur" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Radius: <span className="tabular-nums font-semibold">{state.blurRadius ?? 8}</span>px
          </span>
          <input type="range" min={2} max={20} step={1}
            value={state.blurRadius ?? 8}
            onChange={(e) => onChange({ blurRadius: Number(e.target.value) })}
            className="w-full accent-[var(--vs-accent)]"
          />
        </label>
      )}

      {op === "pixelate" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Cell size: <span className="tabular-nums font-semibold">{state.pixelCellSize ?? 8}</span>px
          </span>
          <input type="range" min={3} max={16} step={1}
            value={state.pixelCellSize ?? 8}
            onChange={(e) => onChange({ pixelCellSize: Number(e.target.value) })}
            className="w-full accent-[var(--vs-accent)]"
          />
        </label>
      )}

      {op === "redact" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Fill color</span>
          <div className="flex gap-2">
            {(["#000000", "#1e3a5f"] as const).map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Fill color ${color}`}
                onClick={() => onChange({ redactColor: color })}
                style={{ background: color }}
                className={[
                  "w-7 h-7 rounded-md border-2 transition-transform",
                  state.redactColor === color
                    ? "border-[var(--vs-accent)] scale-110"
                    : "border-transparent scale-100",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
