import React, { useRef } from "react";
import type { CaptureMode } from "@/types/capture";

const MODES: { value: CaptureMode; label: string; description: string; iconPath: string }[] = [
  {
    value: "image-chain",
    label: "PNG chain",
    description: "Screenshots on each click — ready for step guides.",
    iconPath: "M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm7 3a2 2 0 100 4 2 2 0 000-4z",
  },
  {
    value: "svg",
    label: "Layered SVG",
    description: "Vector layers per click — editable in any vector tool.",
    iconPath: "M4 14l4-8 4 8M6 10h4M14 6l2 2-2 2",
  },
  {
    value: "video",
    label: "Video",
    description: "WebM recording of the tab.",
    iconPath: "M15 10l-6-4v8l6-4zM3 6h8a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z",
  },
  {
    value: "rrweb",
    label: "HTML replay",
    description: "Self-contained interactive replay.",
    iconPath: "M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 3h12M7 4v3",
  },
];

interface Props {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled: boolean;
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (disabled) return;
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % MODES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + MODES.length) % MODES.length;
    } else {
      return;
    }
    onChange(MODES[next].value);
    btnRefs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Capture mode">
      <span
        className="block text-[10px] font-semibold tracking-[0.6px] uppercase mb-2"
        style={{ color: '#6a7180' }}
      >
        Capture mode
      </span>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m, i) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              ref={(el) => { btnRefs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              disabled={disabled}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(m.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={[
                "relative flex flex-col gap-1 p-[10px] rounded-[10px] border text-left transition-all duration-[160ms]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                active
                  ? "border-[oklch(0.58_0.19_258)] bg-[oklch(0.97_0.035_258)]"
                  : "border-[oklch(0.9_0.008_258)] bg-white hover:bg-[oklch(0.985_0.005_258)]",
              ].join(" ")}
            >
              {active && (
                <span
                  className="absolute top-[6px] right-2 text-[9px] font-bold tracking-[0.4px] uppercase px-[5px] py-[2px] rounded-[4px] text-white"
                  style={{ background: 'oklch(0.58 0.19 258)' }}
                >
                  On
                </span>
              )}
              <div
                className="flex items-center gap-[7px] text-[13px] font-semibold whitespace-nowrap"
                style={{ color: active ? 'oklch(0.38 0.14 258)' : '#1d2230' }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                >
                  <path d={m.iconPath} />
                </svg>
                {m.label}
              </div>
              <span className="text-[11px] leading-[1.35]" style={{ color: '#6a7180' }}>
                {m.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
