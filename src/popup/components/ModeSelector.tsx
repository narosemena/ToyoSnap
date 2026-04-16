import React from "react";
import type { CaptureMode } from "@/types/capture";

// DOM Replay and Video are reserved for a future release.
const MODES: { value: CaptureMode; label: string; description: string }[] = [
  { value: "image-chain", label: "Screenshot Chain", description: "PNG snapshot on each click" },
  { value: "svg", label: "SVG Layers", description: "Vector capture on each click" },
];

interface Props {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled: boolean;
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <label
        htmlFor="capture-mode"
        className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
      >
        Capture mode
      </label>
      <select
        id="capture-mode"
        value={value}
        onChange={(e) => onChange(e.target.value as CaptureMode)}
        disabled={disabled}
        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm disabled:opacity-50"
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label} — {m.description}
          </option>
        ))}
      </select>
    </div>
  );
}
