// VectoSnap popup (360×480). Appears anchored below the extension icon.

const popupStyles = {
  shell: {
    width: 360,
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid oklch(0.9 0.008 258)',
    boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1d2230',
  },
  header: {
    padding: '14px 16px 10px',
    display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid oklch(0.94 0.005 258)',
  },
  brand: {
    fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
  },
  zeroBadge: {
    marginLeft: 'auto',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 8px', borderRadius: 999,
    background: 'oklch(0.96 0.04 155)', color: 'oklch(0.34 0.1 155)',
    fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: { padding: '14px 16px 16px' },
  section: { marginBottom: 14 },
  label: {
    fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
    color: '#6a7180', marginBottom: 8, display: 'block',
  },
  modeGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
  },
  modeCard: (active, disabled) => ({
    padding: '10px 10px',
    border: active ? '1.5px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.9 0.008 258)',
    background: active ? 'oklch(0.97 0.035 258)' : '#fff',
    borderRadius: 10,
    display: 'flex', flexDirection: 'column', gap: 4,
    textAlign: 'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 160ms ease-out',
    position: 'relative',
  }),
  modeTitle: (active) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 13, fontWeight: 600,
    color: active ? 'oklch(0.38 0.14 258)' : '#1d2230',
  }),
  modeDesc: { fontSize: 11, color: '#6a7180', lineHeight: 1.35 },
  toggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', border: '1px solid oklch(0.94 0.005 258)',
    borderRadius: 10, background: '#fff',
  },
  toggleLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  switch: (on) => ({
    width: 32, height: 18, borderRadius: 10, padding: 2,
    background: on ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
    transition: 'background 180ms',
    display: 'flex', alignItems: 'center',
  }),
  switchDot: (on) => ({
    width: 14, height: 14, borderRadius: '50%', background: '#fff',
    transform: `translateX(${on ? 14 : 0}px)`,
    transition: 'transform 180ms',
    boxShadow: '0 1px 2px rgba(0,0,0,.2)',
  }),
  recordBtn: (recording) => ({
    width: '100%', padding: '12px 14px', borderRadius: 10,
    background: recording ? 'oklch(0.96 0.02 25)' : 'oklch(0.58 0.19 258)',
    color: recording ? 'oklch(0.42 0.18 25)' : '#fff',
    border: recording ? '1px solid oklch(0.84 0.1 25)' : 'none',
    fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer',
    transition: 'all 160ms',
  }),
  stat: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 12, padding: '4px 2px',
  },
  footer: {
    borderTop: '1px solid oklch(0.94 0.005 258)',
    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
    background: 'oklch(0.985 0.005 258)',
    fontSize: 11, color: '#6a7180',
  },
};

function ModeCard({ icon, title, desc, active, onClick, shortcut, disabled }) {
  return (
    <button style={popupStyles.modeCard(active, disabled)} onClick={disabled ? undefined : onClick}>
      {active && (
        <span style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
          padding: '2px 5px', borderRadius: 4,
          background: 'oklch(0.58 0.19 258)', color: '#fff',
          textTransform: 'uppercase',
        }}>On</span>
      )}
      <div style={popupStyles.modeTitle(active)}>
        <Icon name={icon} size={15} stroke={active ? 'oklch(0.38 0.14 258)' : '#454c5a'}/>
        <span style={{ whiteSpace: 'nowrap' }}>{title}</span>
      </div>
      <div style={popupStyles.modeDesc}>{desc}</div>
    </button>
  );
}

const MODES = [
  { id: 'png',   icon: 'image', title: 'PNG chain',   desc: 'Screenshots on each click — ready for step guides.', shortcut: '2' },
  { id: 'svg',   icon: 'svg',   title: 'Layered SVG', desc: 'Vector layers per click — editable in any vector tool.', shortcut: '4' },
  { id: 'video', icon: 'video', title: 'Video',       desc: 'WebM recording of the tab.', shortcut: '1' },
  { id: 'html',  icon: 'html',  title: 'HTML replay', desc: 'Self‑contained interactive replay.', shortcut: '3' },
];

// Idle state of popup — before recording starts
function PopupIdle({ mode, onMode, cursor, onCursor, onStart, hasSessions, onOpenStudio, emphasizeRecord }) {
  return (
    <div style={popupStyles.shell}>
      <div style={popupStyles.header}>
        <Icon name="logo" size={20}/>
        <div style={popupStyles.brand}>VectoSnap</div>
        <span style={popupStyles.zeroBadge}>
          <Icon name="shield-check" size={10} stroke="oklch(0.34 0.1 155)"/>
          Zero‑egress
        </span>
      </div>
      <div style={popupStyles.body}>
        <div style={popupStyles.section}>
          <span style={popupStyles.label}>Capture mode</span>
          <div style={popupStyles.modeGrid}>
            {MODES.map(m => (
              <ModeCard key={m.id} {...m}
                active={mode === m.id}
                onClick={() => onMode(m.id)}
              />
            ))}
          </div>
        </div>

        <div style={popupStyles.section}>
          <div style={popupStyles.toggle}>
            <div style={popupStyles.toggleLeft}>
              <Icon name="cursor" size={16}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Capture cursor</div>
                <div style={{ fontSize: 11, color: '#6a7180' }}>Overlay pointer at each step</div>
              </div>
            </div>
            <button
              style={popupStyles.switch(cursor)}
              onClick={() => onCursor(!cursor)}
              aria-pressed={cursor}
            >
              <div style={popupStyles.switchDot(cursor)}/>
            </button>
          </div>
        </div>

        <button
          style={{
            ...popupStyles.recordBtn(false),
            boxShadow: emphasizeRecord ? '0 0 0 4px oklch(0.88 0.06 258)' : 'none',
            animation: emphasizeRecord ? 'vs-bob 1.4s ease-in-out infinite' : 'none',
          }}
          onClick={onStart}
        >
          <Icon name="record" size={12}/>
          Start recording
        </button>

        {hasSessions ? (
          <button onClick={onOpenStudio} style={{
            marginTop: 10, width: '100%', padding: '8px 10px', borderRadius: 8,
            background: 'transparent', color: '#454c5a', fontSize: 12, fontWeight: 500,
            border: '1px solid oklch(0.93 0.006 258)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="folder" size={13}/> Open Studio
          </button>
        ) : null}
      </div>
      <div style={popupStyles.footer}>
        <Icon name="lock" size={12}/>
        All capture stays on this machine. No network calls.
      </div>
      <style>{`@keyframes vs-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1px)} }`}</style>
    </div>
  );
}

// Recording state — live step counter + stop button
function PopupRecording({ mode, cursor, steps, elapsed, onStop, onPause, paused }) {
  const modeMeta = MODES.find(m => m.id === mode);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <div style={popupStyles.shell}>
      <div style={popupStyles.header}>
        <Icon name="logo" size={20}/>
        <div style={popupStyles.brand}>VectoSnap</div>
        <span style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 8px', borderRadius: 999,
          background: 'oklch(0.96 0.035 25)', color: 'oklch(0.42 0.18 25)',
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: 'oklch(0.58 0.19 25)',
            animation: paused ? 'none' : 'vs-pulse-in 1.2s ease-in-out infinite',
          }}/>
          {paused ? 'Paused' : 'Recording'}
        </span>
      </div>

      <div style={popupStyles.body}>
        {/* Live stats panel */}
        <div style={{
          background: 'linear-gradient(180deg, oklch(0.98 0.02 258) 0%, #fff 100%)',
          border: '1px solid oklch(0.92 0.02 258)',
          borderRadius: 12, padding: 14, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6a7180', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Elapsed
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: '#1d2230', lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {mm}:{ss}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6a7180', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Steps captured
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'oklch(0.38 0.14 258)', lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {String(steps).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* Settings summary */}
        <div style={{ background: '#f7f8fa', borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12 }}>
          <div style={popupStyles.stat}>
            <span style={{ color: '#6a7180' }}>Mode</span>
            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name={modeMeta.icon} size={13}/>{modeMeta.title}
            </span>
          </div>
          <div style={popupStyles.stat}>
            <span style={{ color: '#6a7180' }}>Cursor</span>
            <span style={{ fontWeight: 600 }}>{cursor ? 'Captured' : 'Hidden'}</span>
          </div>
          <div style={popupStyles.stat}>
            <span style={{ color: '#6a7180' }}>Storage</span>
            <span className="mono" style={{ fontWeight: 600 }}>{(steps * 0.18).toFixed(1)} MB · session</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onPause}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: '#fff', border: '1px solid oklch(0.9 0.008 258)',
              color: '#1d2230', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name={paused ? 'play' : 'pause'} size={14}/>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onStop}
            style={{
              flex: 1.4, padding: '10px', borderRadius: 10,
              background: 'oklch(0.58 0.19 25)', color: '#fff',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name="stop" size={12}/> Stop & review
          </button>
        </div>
      </div>

      <div style={popupStyles.footer}>
        <Icon name="lock" size={12}/>
        Captured locally · {steps} step{steps === 1 ? '' : 's'} encrypted in session storage
      </div>
      <style>{`@keyframes vs-pulse-in { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}

Object.assign(window, { PopupIdle, PopupRecording, MODES });
