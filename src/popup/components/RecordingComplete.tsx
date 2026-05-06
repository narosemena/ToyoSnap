import React from "react";
import type { CaptureMode } from "@/types/capture";

const MODE_LABELS: Record<CaptureMode, string> = {
  'image-chain': 'PNG chain',
  'svg':         'SVG layers',
  'video':       'Video',
  'rrweb':       'HTML replay',
};

interface Props {
  steps: number;
  durationMs: number;
  mode: CaptureMode;
  onOpenStudio: () => void;
  onDismiss: () => void;
}

export function RecordingComplete({ steps, durationMs, mode, onOpenStudio, onDismiss }: Props) {
  const totalSec = Math.floor(durationMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const duration = `${m}m ${s}s`;
  const sizeMB = (steps * 0.18).toFixed(1);

  return (
    <div className="px-4 py-[18px] flex flex-col gap-[14px]">
      <div className="flex items-start gap-[10px]">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)' }}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M4 10l4 4 8-8" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-semibold tracking-[-0.2px]" style={{ color: '#1d2230' }}>
            Recording saved locally.
          </div>
          <div className="text-[13px] mt-1 leading-[1.5]" style={{ color: '#454c5a' }}>
            {steps} steps · {duration} · {MODE_LABELS[mode]} · encrypted in session storage.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[10px]">
        {[
          { label: 'Steps',    value: String(steps).padStart(2, '0') },
          { label: 'Duration', value: duration },
          { label: 'Size',     value: `${sizeMB} MB` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[10px] px-3 py-[10px]"
            style={{ background: 'oklch(0.985 0.005 250)', border: '1px solid oklch(0.93 0.006 250)' }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.6px]" style={{ color: '#6a7180' }}>
              {label}
            </div>
            <div className="text-[17px] font-semibold mt-[2px]" style={{ fontVariantNumeric: 'tabular-nums', color: '#1d2230' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenStudio}
          className="flex-[1.4] py-[11px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-[6px] transition-opacity hover:opacity-90"
          style={{ background: 'oklch(0.58 0.19 258)' }}
        >
          Review &amp; export in Studio
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 py-[11px] rounded-[10px] text-[13px] font-medium transition-colors hover:bg-gray-50"
          style={{
            background: '#fff',
            border: '1px solid oklch(0.92 0.008 258)',
            color: '#454c5a',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
