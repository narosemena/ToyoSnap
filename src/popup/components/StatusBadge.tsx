import React from "react";

interface Props {
  isRecording: boolean;
}

export function StatusBadge({ isRecording }: Props) {
  if (!isRecording) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
      REC
    </span>
  );
}
