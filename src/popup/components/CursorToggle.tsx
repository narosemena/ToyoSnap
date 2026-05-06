import React from "react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}

export function CursorToggle({ checked, onChange, disabled }: Props) {
  return (
    <div
      className="flex items-center justify-between p-[10px_12px] rounded-[10px] border"
      style={{ borderColor: 'oklch(0.94 0.005 258)' }}
    >
      <div className="flex items-center gap-[10px]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
          stroke="#454c5a" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M4 4l6 14 2.5-5.5L18 10z" />
        </svg>
        <div>
          <div className="text-[13px] font-medium" style={{ color: '#1d2230' }}>Capture cursor</div>
          <div className="text-[11px]" style={{ color: '#6a7180' }}>Overlay pointer at each step</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-pressed={checked}
        aria-label="Capture cursor"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width: 32, height: 18, borderRadius: 10, padding: 2,
          background: checked ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
          transition: 'background 180ms',
          display: 'flex', alignItems: 'center',
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            transform: checked ? 'translateX(14px)' : 'translateX(0px)',
            transition: 'transform 180ms',
            boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          }}
        />
      </button>
    </div>
  );
}
