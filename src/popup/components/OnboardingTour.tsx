import React, { useState } from "react";

const SLIDES = [
  {
    icon: 'record',
    title: 'Choose a capture mode',
    body: 'PNG chain for step guides. SVG for editable vectors. HTML for interactive replay.',
  },
  {
    icon: 'cursor',
    title: 'Record on any page',
    body: 'Click the browser tab you want to capture, then Start. Every click becomes a step.',
  },
  {
    icon: 'download',
    title: 'Review, sanitize, export',
    body: 'Blur PII in Studio, then export locally as .zip, .webm, .html or Markdown.',
  },
];

const ICON_PATHS: Record<string, string> = {
  record:   'M6 6h8v8H6z',
  cursor:   'M4 4l6 14 2.5-5.5L18 10z',
  download: 'M10 3v10m0 0l-4-4m4 4l4-4M3 17h14',
};

interface Props {
  onDone: () => void;
}

export function OnboardingTour({ onDone }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  return (
    <div
      className="w-[360px] overflow-hidden"
      style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid oklch(0.9 0.008 258)',
        boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      }}
    >
      <div className="px-[18px] pt-5 pb-4">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-[10px]"
          style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d={ICON_PATHS[slide.icon]} />
          </svg>
        </div>
        <div className="text-[16px] font-semibold" style={{ color: '#1d2230' }}>
          {slide.title}
        </div>
        <div className="text-[13px] mt-1 leading-[1.5]" style={{ color: '#454c5a' }}>
          {slide.body}
        </div>
      </div>

      <div
        className="px-4 py-[10px] flex items-center gap-3"
        style={{ borderTop: '1px solid oklch(0.94 0.005 258)', paddingBottom: 14 }}
      >
        <div className="flex gap-1">
          {SLIDES.map((_, k) => (
            <div
              key={k}
              style={{
                width: k === i ? 18 : 6, height: 6, borderRadius: 3,
                background: k === i ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
                transition: 'all 180ms',
              }}
            />
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="px-[10px] py-[6px] text-xs"
            style={{ color: '#6a7180' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => isLast ? onDone() : setI(i + 1)}
            className="px-3 py-[6px] rounded-[8px] text-xs font-semibold text-white flex items-center gap-1 transition-opacity hover:opacity-90"
            style={{ background: 'oklch(0.58 0.19 258)' }}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
