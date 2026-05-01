import React from "react";
import type { CaptureMode } from "@/types/capture";

const MODES: { value: CaptureMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "image-chain",
    label: "Screenshot Chain",
    description: "Raster snapshot on each click",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="16" height="12" rx="2"/>
        <circle cx="10" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    value: "svg",
    label: "SVG Layers",
    description: "Vector capture on each click",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 14l4-8 4 8"/><path d="M6 10h4"/>
        <path d="M14 6l2 2-2 2"/>
      </svg>
    ),
  },
];

interface Props {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled: boolean;
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Capture mode">
      <p className="text-xs font-medium mb-1.5 text-gray-500 dark:text-gray-400">Capture mode</p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              disabled={disabled}
              onClick={() => onChange(m.value)}
              className={[
                "flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                active
                  ? "border-[var(--vs-accent)] bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              {m.icon}
              <span className="text-xs font-semibold leading-tight">{m.label}</span>
              <span className="text-[10px] leading-tight opacity-70">{m.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
