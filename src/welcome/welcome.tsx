import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';

const FEATURES = [
  { icon: 'shield', title: 'Zero‑egress', desc: 'CSP blocks all outbound network calls.' },
  { icon: 'lock',   title: 'Encrypted at rest', desc: 'AES‑GCM session key — wiped on exit.' },
  { icon: 'layers', title: '5 export formats', desc: 'PNG chain, SVG layers, video, HTML, docs.' },
];

function WelcomeScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-10"
      style={{ background: 'linear-gradient(180deg, oklch(0.98 0.015 258) 0%, #ffffff 60%)' }}
    >
      <div className="max-w-[620px] w-full text-center">
        <div
          className="w-[68px] h-[68px] rounded-[18px] mx-auto mb-[18px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, oklch(0.62 0.19 258), oklch(0.48 0.18 270))',
            boxShadow: '0 20px 40px oklch(0.58 0.19 258 / 0.35)',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect width="20" height="20" rx="5" fill="white" fillOpacity="0.9"/>
            <path d="M5 10h10M10 5v10" stroke="oklch(0.62 0.19 258)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-[34px] font-semibold tracking-[-0.6px] mb-[10px]" style={{ color: '#1d2230' }}>
          Welcome to ToyoSnap
        </h1>
        <p className="text-[15px] leading-[1.55] mb-[22px]" style={{ color: '#454c5a' }}>
          Capture any web workflow as screenshots, vectors, or an interactive replay.
          Nothing leaves your machine &mdash; ever.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[10px] p-[14px] text-left"
              style={{ background: '#fff', border: '1px solid oklch(0.93 0.006 258)' }}
            >
              <div
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2"
                style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                >
                  {f.icon === 'shield' && <path d="M10 2l6 3v5c0 4-6 8-6 8S4 14 4 10V5l6-3z"/>}
                  {f.icon === 'lock'   && <><rect x="3" y="9" width="14" height="9" rx="2"/><path d="M7 9V7a3 3 0 016 0v2"/></>}
                  {f.icon === 'layers' && <><path d="M2 10l8-5 8 5-8 5-8-5z"/><path d="M2 15l8 5 8-5"/></>}
                </svg>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: '#1d2230' }}>{f.title}</div>
              <div className="text-[11.5px] leading-[1.4] mt-[3px]" style={{ color: '#6a7180' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div
          className="rounded-[12px] p-[18px_20px] flex items-center gap-[14px] text-left"
          style={{ background: '#fff', border: '1px dashed oklch(0.86 0.05 258)' }}
        >
          <div
            className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center"
            style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true"
            >
              <path d="M10 2v8m0 0l-3 3m3-3l3 3M3 18h14"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>
              Pin ToyoSnap to your toolbar
            </div>
            <div className="text-[12px]" style={{ color: '#6a7180' }}>
              Click the icon in the upper right to start capturing.
            </div>
          </div>
          <span
            className="text-[11px] px-[10px] py-[6px] rounded-[6px]"
            style={{ color: '#454c5a', background: '#f4f5f8', fontFamily: 'monospace' }}
          >
            top right
          </span>
        </div>

        <div
          className="rounded-[12px] p-[18px_20px] flex items-center gap-[14px] text-left mt-3"
          style={{ background: '#fff', border: '1px dashed oklch(0.86 0.05 258)' }}
        >
          <div
            className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center"
            style={{ background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true"
            >
              <rect x="2" y="5" width="16" height="11" rx="2"/>
              <path d="M6 9h1m3 0h1m3 0h1M6 13h8"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: '#1d2230' }}>
              Keyboard shortcut
            </div>
            <div className="text-[12px]" style={{ color: '#6a7180' }}>
              Press{' '}
              <kbd style={{ fontFamily: 'monospace', background: '#f4f5f8', padding: '1px 5px', borderRadius: 4, border: '1px solid #d4d8e0' }}>
                Alt+Shift+R
              </kbd>{' '}
              to start or stop recording from any tab. Customize at{' '}
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>chrome://extensions/shortcuts</span>.
            </div>
          </div>
          <span
            className="text-[11px] px-[10px] py-[6px] rounded-[6px] whitespace-nowrap"
            style={{ color: '#454c5a', background: '#f4f5f8', fontFamily: 'monospace' }}
          >
            Alt+Shift+R
          </span>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<WelcomeScreen />);
