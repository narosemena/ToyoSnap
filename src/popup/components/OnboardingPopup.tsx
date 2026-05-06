import React from "react";

interface Props {
  onShowTour: () => void;
  onDismiss: () => void;
}

export function OnboardingPopup({ onShowTour, onDismiss }: Props) {
  return (
    <div
      className="w-[360px] overflow-hidden"
      style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid oklch(0.9 0.008 258)',
        boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      }}
    >
      <div
        className="px-[18px] pt-5 pb-4"
        style={{ background: 'linear-gradient(135deg, oklch(0.96 0.035 258), oklch(0.94 0.06 270))' }}
      >
        <div className="flex items-center gap-[10px]">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="ob-logo" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="oklch(0.62 0.19 258)"/>
                <stop offset="100%" stopColor="oklch(0.48 0.18 270)"/>
              </linearGradient>
            </defs>
            <rect width="20" height="20" rx="5" fill="url(#ob-logo)"/>
            <path d="M5 10h10M10 5v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>ToyoSnap</span>
          <span
            className="ml-auto text-[10px] font-bold tracking-[0.4px] px-2 py-[3px] rounded-full"
            style={{ background: '#fff', color: 'oklch(0.38 0.14 258)' }}
          >
            v 1.0
          </span>
        </div>
        <div className="text-[18px] font-semibold mt-3 tracking-[-0.2px]" style={{ color: '#1d2230' }}>
          You're all set.
        </div>
        <div className="text-[12.5px] mt-1 leading-[1.45]" style={{ color: '#454c5a' }}>
          Take a 30&#8209;second tour, or jump straight in.
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onShowTour}
          className="w-full py-[10px] px-[14px] rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-[6px] transition-opacity hover:opacity-90"
          style={{ background: 'oklch(0.58 0.19 258)' }}
        >
          Show me how it works
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-[10px] px-[14px] rounded-[10px] text-[13px] font-medium transition-colors hover:bg-gray-50"
          style={{
            background: 'transparent',
            border: '1px solid oklch(0.92 0.008 258)',
            color: '#454c5a',
          }}
        >
          Skip — I'll figure it out
        </button>
      </div>
    </div>
  );
}
