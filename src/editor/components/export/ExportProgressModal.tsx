// src/editor/components/export/ExportProgressModal.tsx
import React from "react";

interface Props {
  phase: "progress" | "done";
  percent: number;
  filename: string;
  onDone: () => void;
  onExportAnother: () => void;
}

export function ExportProgressModal({ phase, percent, filename, onDone, onExportAnother }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phase === "progress" ? "Exporting" : "Export complete"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="w-80 rounded-xl bg-white dark:bg-gray-900 p-6 flex flex-col gap-4"
        style={{ boxShadow: "var(--vs-shadow-popup)" }}>

        {phase === "progress" ? (
          <>
            <div className="flex items-center gap-2">
              <svg className="motion-safe:animate-spin h-4 w-4 shrink-0"
                style={{ color: "var(--vs-accent)" }}
                viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Exporting…
              </span>
              <span className="ml-auto text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
                {percent}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%`, background: "var(--vs-accent)" }}
              />
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              All processing happens locally — no data leaves your device.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8.5" stroke="oklch(0.62 0.15 155)" strokeWidth="1.5"/>
                <path d="M6 10.5l2.5 2.5 5-5" stroke="oklch(0.62 0.15 155)"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Export complete
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3M8 2v8M5 7l3 3 3-3"/>
              </svg>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                {filename}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExportAnother}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Export another format
              </button>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--vs-accent)" }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
