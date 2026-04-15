import React from "react";
import type { CaptureMode } from "@/types/capture";

const MODES: { value: CaptureMode; label: string }[] = [
  { value: "rrweb", label: "DOM Replay" },
  { value: "image-chain", label: "Screenshot Chain" },
  { value: "video", label: "Video" },
  { value: "svg", label: "SVG Layers" },
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
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
