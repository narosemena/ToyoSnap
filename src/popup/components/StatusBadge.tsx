import React from "react";

interface Props {
  isRecording: boolean;
  isPaused: boolean;
}

export function StatusBadge({ isRecording, isPaused }: Props) {
  if (!isRecording) {
    return (
      <span
        className="inline-flex items-center gap-[5px] px-2 py-[3px] rounded-full text-[10px] font-semibold tracking-[0.3px] uppercase"
        style={{ background: 'oklch(0.96 0.04 155)', color: 'oklch(0.34 0.1 155)' }}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1l1.5 2.5H13l-2.5 2 1 3L8 7l-3.5 1.5 1-3L3 3h3.5L8 1z" fill="currentColor"/>
        </svg>
        Zero‑egress
      </span>
    );
  }

  return (
    <span
      className="ml-auto inline-flex items-center gap-[6px] px-2 py-[3px] rounded-full text-[10px] font-bold tracking-[0.6px] uppercase"
      style={{
        background: 'oklch(0.96 0.035 25)',
        color: 'oklch(0.42 0.18 25)',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{
          background: 'oklch(0.58 0.19 25)',
          animation: isPaused ? 'none' : 'vs-pulse-badge 1.2s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      {isPaused ? 'Paused' : 'Recording'}
    </span>
  );
}
