// VectoSnap Studio — editor page served from chrome-extension://[id]/editor.html
// Surfaces: left nav, timeline (bottom), canvas (center), right inspector with export panel.

const studioStyles = {
  root: {
    width: '100%', height: '100%',
    display: 'grid',
    gridTemplateRows: '52px 1fr 148px',
    gridTemplateColumns: '56px 1fr 340px',
    gridTemplateAreas: `
      "top top top"
      "nav canvas inspector"
      "nav timeline timeline"
    `,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1d2230', background: '#f4f5f8',
    overflow: 'hidden', fontSize: 13,
  },
  top: {
    gridArea: 'top',
    background: '#ffffff',
    borderBottom: '1px solid oklch(0.93 0.006 258)',
    padding: '0 18px', display: 'flex', alignItems: 'center', gap: 14,
  },
  nav: {
    gridArea: 'nav', background: '#ffffff',
    borderRight: '1px solid oklch(0.93 0.006 258)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '14px 0', gap: 6,
  },
  navBtn: (active) => ({
    width: 40, height: 40, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: active ? 'oklch(0.38 0.14 258)' : '#6a7180',
    background: active ? 'oklch(0.96 0.04 258)' : 'transparent',
  }),
  canvasArea: {
    gridArea: 'canvas', overflow: 'hidden', position: 'relative',
    background: '#eef0f4',
    display: 'flex', flexDirection: 'column',
  },
  canvasBar: {
    height: 44, background: '#fff',
    borderBottom: '1px solid oklch(0.93 0.006 258)',
    display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
    fontSize: 12,
  },
  canvas: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 28, overflow: 'auto',
  },
  stage: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(15,20,35,.12), 0 6px 16px rgba(15,20,35,.05)',
    position: 'relative',
    width: 820, height: 480,
  },
  inspector: {
    gridArea: 'inspector', background: '#ffffff',
    borderLeft: '1px solid oklch(0.93 0.006 258)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  inspTabs: {
    display: 'flex', borderBottom: '1px solid oklch(0.93 0.006 258)',
    padding: '0 8px', gap: 4,
  },
  inspTab: (active) => ({
    padding: '12px 12px 10px',
    fontSize: 12.5, fontWeight: 600,
    color: active ? '#1d2230' : '#6a7180',
    borderBottom: active ? '2px solid oklch(0.58 0.19 258)' : '2px solid transparent',
    marginBottom: -1,
  }),
  inspBody: { flex: 1, overflow: 'auto', padding: '14px 16px' },
  label: {
    fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
    color: '#6a7180', marginBottom: 8, display: 'block',
  },
  timeline: {
    gridArea: 'timeline', background: '#ffffff',
    borderTop: '1px solid oklch(0.93 0.006 258)',
    padding: '10px 16px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
};

// Captured-step mock data (for when flow reaches Studio)
const CAPTURED_STEPS = [
  { idx: 1, label: 'Click "Open" on AUD‑4829', thumb: 'queue', action: 'click', el: 'button[aria-label="Open"]' },
  { idx: 2, label: 'View Quality scorecard',     thumb: 'detail', action: 'navigate', el: '/audits/AUD-4829' },
  { idx: 3, label: 'Scroll to transcript',       thumb: 'transcript', action: 'scroll', el: 'window' },
  { idx: 4, label: 'Click "Approve audit"',      thumb: 'approve', action: 'click', el: 'button#approve' },
];

// Miniature of the host app used as a timeline thumbnail
function StepThumb({ kind, blurTargets = [] }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#fff',
      borderRadius: 4, overflow: 'hidden', position: 'relative',
      transform: 'scale(1)', transformOrigin: 'top left',
    }}>
      <div style={{ height: '22%', background: '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: 1, background: '#fff', opacity: 0.6 }}/>
        <div style={{ width: 14, height: 2, background: '#fff', opacity: 0.5 }}/>
      </div>
      <div style={{ display: 'flex', height: '78%' }}>
        <div style={{ width: 18, background: '#f7f8fa', borderRight: '1px solid #eef1f5' }}/>
        <div style={{ flex: 1, padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {kind === 'queue' && (
            <>
              <div style={{ height: 3, width: '50%', background: '#d4d8e0', borderRadius: 1 }}/>
              <div style={{ height: 2, width: '35%', background: '#eef1f5', borderRadius: 1, marginBottom: 2 }}/>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <div style={{
                    height: 2, flex: 1,
                    background: blurTargets.includes(`row-${i}`) ? 'repeating-linear-gradient(90deg, #e4e7ed 0 2px, #f7f8fa 2px 4px)' : '#eef1f5',
                    filter: blurTargets.includes(`row-${i}`) ? 'blur(0.8px)' : 'none',
                    borderRadius: 1,
                  }}/>
                  {i === 0 && <div style={{ width: 8, height: 3, background: 'oklch(0.58 0.19 258)', borderRadius: 1 }}/>}
                </div>
              ))}
            </>
          )}
          {kind === 'detail' && (
            <>
              <div style={{ height: 3, width: '60%', background: '#d4d8e0', borderRadius: 1 }}/>
              <div style={{ height: 2, width: '40%', background: '#eef1f5', borderRadius: 1, marginBottom: 2 }}/>
              <div style={{ height: 16, background: '#f7f8fa', borderRadius: 2 }}/>
              <div style={{ height: 10, background: '#f7f8fa', borderRadius: 2 }}/>
            </>
          )}
          {kind === 'transcript' && (
            <>
              <div style={{ height: 2, width: '55%', background: '#d4d8e0', borderRadius: 1 }}/>
              <div style={{
                height: 2, width: '80%',
                background: blurTargets.includes('pii-email') ? '#e4e7ed' : '#eef1f5',
                filter: blurTargets.includes('pii-email') ? 'blur(0.8px)' : 'none',
                borderRadius: 1,
              }}/>
              <div style={{ height: 2, width: '45%', background: '#eef1f5', borderRadius: 1 }}/>
              <div style={{ height: 2, width: '70%', background: '#eef1f5', borderRadius: 1 }}/>
            </>
          )}
          {kind === 'approve' && (
            <>
              <div style={{ height: 3, width: '65%', background: '#d4d8e0', borderRadius: 1 }}/>
              <div style={{ height: 18, background: '#f7f8fa', borderRadius: 2 }}/>
              <div style={{ marginLeft: 'auto', width: 18, height: 4, background: 'oklch(0.58 0.19 258)', borderRadius: 1 }}/>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Timeline({ steps, active, onSelect, blurStep, blurTargets }) {
  return (
    <div style={studioStyles.timeline}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6a7180', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Timeline
        </div>
        <span className="mono" style={{ fontSize: 11, color: '#8a919e' }}>
          {steps.length} steps · 42 sec
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, color: '#6a7180' }}>
            <Icon name="play" size={11}/> Replay
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {steps.map((s, i) => {
          const isActive = i === active;
          const isBlur = blurStep === i;
          return (
            <button
              key={s.idx}
              onClick={() => onSelect(i)}
              style={{
                width: 120, flexShrink: 0,
                border: isActive ? '2px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.92 0.008 258)',
                borderRadius: 8, padding: 6, background: '#fff',
                textAlign: 'left', position: 'relative',
                boxShadow: isActive ? '0 0 0 3px oklch(0.96 0.035 258)' : 'none',
                transition: 'all 140ms',
              }}
            >
              <div style={{ width: '100%', height: 56, background: '#fafbfc', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <StepThumb kind={s.thumb} blurTargets={isBlur ? blurTargets : []}/>
                {isBlur && (
                  <div style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 14, height: 14, borderRadius: 4,
                    background: 'oklch(0.72 0.15 80)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="blur" size={9} stroke="#fff"/>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <span className="mono" style={{
                  fontSize: 10, fontWeight: 600,
                  color: isActive ? 'oklch(0.38 0.14 258)' : '#8a919e',
                }}>
                  {String(s.idx).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 11, color: '#2a303e', lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Canvas for the current step — renders the captured host app frozen at that state
function CanvasStage({ activeStep, blurTargets, onBlurTarget, blurMode }) {
  const step = CAPTURED_STEPS[activeStep];
  const screen = step.thumb === 'queue' ? 'queue' : 'detail';
  const highlight = step.thumb === 'approve' ? 'approve' : step.thumb === 'queue' ? 'open-btn' : null;

  // Overlay click-to-blur regions above the iframe-like stage
  const blurRegions = {
    detail: [
      { id: 'pii-name',   label: 'Customer name',  rect: { left: 600, top: 370, width: 180, height: 16 } },
      { id: 'pii-email',  label: 'Customer email', rect: { left: 600, top: 390, width: 180, height: 16 } },
      { id: 'pii-phone',  label: 'Phone number',   rect: { left: 600, top: 410, width: 180, height: 16 } },
    ],
    queue: [
      { id: 'row-1', label: 'Agent name', rect: { left: 172, top: 292, width: 82, height: 18 } },
      { id: 'row-2', label: 'Agent name', rect: { left: 172, top: 335, width: 82, height: 18 } },
    ],
  };

  return (
    <div style={studioStyles.canvasArea}>
      <div style={studioStyles.canvasBar}>
        <span className="mono" style={{ fontSize: 11, color: '#8a919e' }}>
          step {String(step.idx).padStart(2, '0')} / {String(CAPTURED_STEPS.length).padStart(2, '0')}
        </span>
        <div style={{ width: 1, height: 16, background: '#e4e7ed' }}/>
        <span style={{ color: '#2a303e', fontWeight: 500 }}>{step.label}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: '#8a919e' }}>
          {step.el}
        </span>
      </div>
      <div style={studioStyles.canvas}>
        <div style={studioStyles.stage}>
          <HostApp screen={screen} highlight={highlight}/>
          {/* Action marker: red dot where cursor clicked */}
          {step.thumb !== 'transcript' && (
            <div style={{
              position: 'absolute',
              left: screen === 'queue' ? 748 : 754,
              top: screen === 'queue' ? 298 : 116,
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'oklch(0.58 0.19 258 / 0.3)',
                border: '2px solid oklch(0.58 0.19 258)',
                animation: 'vs-ping 1.8s ease-out infinite',
              }}/>
            </div>
          )}
          {/* Blur overlay regions — appear in blurMode */}
          {blurMode && (blurRegions[screen] || []).map(r => {
            const isBlurred = blurTargets.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => onBlurTarget(r.id)}
                style={{
                  position: 'absolute',
                  left: r.rect.left, top: r.rect.top,
                  width: r.rect.width, height: r.rect.height,
                  border: isBlurred ? '1.5px solid oklch(0.48 0.16 80)' : '1.5px dashed oklch(0.58 0.19 258)',
                  background: isBlurred ? 'oklch(0.92 0.06 80 / 0.9)' : 'oklch(0.58 0.19 258 / 0.08)',
                  backdropFilter: isBlurred ? 'blur(6px)' : 'none',
                  borderRadius: 3, cursor: 'pointer',
                  transition: 'all 160ms',
                }}
                title={r.label}
              >
                {!isBlurred && (
                  <span style={{
                    position: 'absolute', top: -20, left: 0,
                    fontSize: 10, padding: '2px 5px', borderRadius: 4,
                    background: 'oklch(0.58 0.19 258)', color: '#fff',
                    whiteSpace: 'nowrap', fontWeight: 500,
                  }}>
                    {r.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes vs-ping {
          0%   { transform: scale(1);   opacity: 1 }
          80%  { transform: scale(2.6); opacity: 0 }
          100% { transform: scale(2.6); opacity: 0 }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { Timeline, CanvasStage, CAPTURED_STEPS, studioStyles });
