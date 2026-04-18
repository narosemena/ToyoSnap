import React from "react";

interface Props {
  value: "png" | "jpeg";
  onChange: (v: "png" | "jpeg") => void;
  disabled: boolean;
}

const OPTIONS: { value: "png" | "jpeg"; label: string; hint: string }[] = [
  { value: "png", label: "PNG", hint: "Lossless" },
  { value: "jpeg", label: "JPEG", hint: "Smaller files" },
];

export function ImageFormatSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        Image format
      </span>
      <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 py-1.5 text-xs font-medium transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              value === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
            ].join(" ")}
            aria-pressed={value === opt.value}
          >
            {opt.label}
            <span className={[
              "block text-[10px] font-normal",
              value === opt.value ? "text-blue-100" : "text-gray-400 dark:text-gray-500",
            ].join(" ")}>
              {opt.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
