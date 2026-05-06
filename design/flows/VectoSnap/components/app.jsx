// Top-level app — storyboard overview + deep-link flows.
// Layout: left rail with flow navigator; right viewport scales the current flow to fit.

const appStyles = {
  root: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    background: 'var(--bg)',
  },
  rail: {
    background: '#ffffff',
    borderRight: '1px solid var(--line)',
    padding: '22px 14px',
    display: 'flex', flexDirection: 'column', gap: 14,
    position: 'sticky', top: 0, height: '100vh', overflow: 'auto',
  },
  railHead: {
    display: 'flex', alignItems: 'center', gap: 10,
    paddingBottom: 14, borderBottom: '1px solid var(--line)',
  },
  railName: { fontSize: 15, fontWeight: 600, letterSpacing: -0.2 },
  railSub: { fontSize: 11, color: 'var(--ink-mute)' },
  flowBtn: (active) => ({
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    background: active ? 'var(--accent-weak)' : 'transparent',
    border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
    textAlign: 'left', cursor: 'pointer', width: '100%',
    transition: 'all 140ms',
  }),
  flowChip: (active) => ({
    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--ink-dim)',
    border: active ? 'none' : '1px solid var(--line)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
  }),
  stage: {
    padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
    minWidth: 0,
  },
};

const FLOWS = [
  { id: 'overview', code: '•', title: 'Overview', sub: 'All happy paths at a glance' },
  { id: 'A',        code: 'A', title: 'First‑time install', sub: 'Welcome → pin → ready' },
  { id: 'B-png',    code: 'B', title: 'Record · PNG chain', sub: 'Popup → capture → stop' },
  { id: 'B-svg',    code: 'B', title: 'Record · Layered SVG', sub: 'Same flow, vector output' },
  { id: 'E-png',    code: 'E', title: 'Export · PNG chain', sub: 'Studio → confirm → .zip' },
  { id: 'E-svg',    code: 'E', title: 'Export · SVG layers', sub: 'Studio → confirm → .zip' },
  { id: 'F',        code: 'F', title: 'Redact PII (PNG)', sub: 'Per-region blur + redact primitives' },
];

function FlowShell({ title, onExit, rightControls, children }) {
  // Scale a fixed 1440×900 design canvas to fit available width.
  const outerRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const DESIGN_W = 1440;
  const DESIGN_H = 900;
  React.useLayoutEffect(() => {
    const recalc = () => {
      if (!outerRef.current) return;
      const w = outerRef.current.clientWidth;
      const s = Math.min(1, w / DESIGN_W);
      setScale(s);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (outerRef.current) ro.observe(outerRef.current);
    window.addEventListener('resize', recalc);
    return () => { ro.disconnect(); window.removeEventListener('resize', recalc); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {rightControls}
          <button onClick={onExit} style={{
            padding: '7px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            color: 'var(--ink-dim)', border: '1px solid var(--line)', background: '#fff',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="chevron-left" size={13}/> All flows
          </button>
        </div>
      </div>
      <div
        ref={outerRef}
        style={{
          background: '#fff', borderRadius: 16, border: '1px solid var(--line)',
          boxShadow: '0 1px 3px rgba(15,20,35,.03)',
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          height: DESIGN_H * scale,
        }}
      >
        <div style={{
          width: DESIGN_W, height: DESIGN_H,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          position: 'absolute', top: 0, left: 0,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FlowSteps({ steps, active, onClick }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto',
    }}>
      {steps.map((s, i) => {
        const isActive = i === active;
        const isPast = i < active;
        return (
          <React.Fragment key={i}>
            <button
              onClick={onClick ? () => onClick(i) : undefined}
              disabled={!onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 8px', borderRadius: 8,
                cursor: onClick ? 'pointer' : 'default',
                color: isActive ? 'var(--accent-ink)' : isPast ? 'var(--ink)' : 'var(--ink-mute)',
              }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isActive ? 'var(--accent)' : isPast ? 'oklch(0.94 0.08 155)' : 'var(--surface-2)',
                color: isActive ? '#fff' : isPast ? 'oklch(0.34 0.1 155)' : 'var(--ink-mute)',
                border: isActive || isPast ? 'none' : '1px solid var(--line-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
              }}>
                {isPast ? <Icon name="check" size={11} stroke="oklch(0.34 0.1 155)"/> : i + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap' }}>{s}</span>
            </button>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, minWidth: 12, height: 1,
                background: i < active ? 'oklch(0.84 0.1 155)' : 'var(--line)',
              }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FlowHint({ children }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      background: 'oklch(0.98 0.015 258)',
      border: '1px dashed var(--accent-border)',
      color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.5,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-weak)', color: 'var(--accent-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="sparkle" size={12} stroke="var(--accent-ink)"/>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Overview({ onGo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.4 }}>
          VectoSnap — happy-path flows
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>
          Three end-to-end scenarios for the Zero-Egress WorkflowCapture extension, scoped to PNG and layered-SVG outputs. Every surface is interactive — click into any flow to step through real popup states, in-page recording overlays, and the Studio export dialog.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <FlowCard
          code="A" title="First-time install & setup"
          desc="User installs VectoSnap from the store. Welcome tab loads, popup opens with a 3-step tour, lands in idle state ready to record."
          highlights={['Onboarding popup', 'Coach mark on toolbar', 'Zero-egress badge']}
          onGo={() => onGo('A')}
        />
        <FlowCard
          code="B" title="Record a workflow"
          desc="User configures mode + cursor, starts recording, captures two clicks on a QA audit, stops and is invited into Studio."
          highlights={['PNG or SVG mode', 'Live step counter', 'Stop → review CTA']}
          onGo={() => onGo('B-png')}
          secondary={{ label: 'Try SVG variant', onClick: () => onGo('B-svg') }}
        />
        <FlowCard
          code="E" title="Review & export"
          desc="Studio opens with the captured session, optional click-to-blur for PII, pick format, sensitivity warning, local download."
          highlights={['Click-to-blur canvas', 'Sensitivity warning', 'Local .zip download']}
          onGo={() => onGo('E-png')}
          secondary={{ label: 'Export SVG', onClick: () => onGo('E-svg') }}
        />
      </div>

      <Storyboard onGo={onGo}/>
    </div>
  );
}

function FlowCard({ code, title, desc, highlights, onGo, secondary }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line)', borderRadius: 14,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
        }}>{code}</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{desc}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {highlights.map(h => (
          <li key={h} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--accent-weak)', color: 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={9} stroke="var(--accent-ink)"/>
            </span>
            {h}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 6 }}>
        <button onClick={onGo} style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          background: 'var(--accent)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          Play flow <Icon name="chevron-right" size={12}/>
        </button>
        {secondary && (
          <button onClick={secondary.onClick} style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
            color: 'var(--ink-dim)', border: '1px solid var(--line)', background: '#fff',
          }}>{secondary.label}</button>
        )}
      </div>
    </div>
  );
}

// Small end-to-end storyboard strip
function Storyboard({ onGo }) {
  const frames = [
    { flow: 'A', n: 'A·1', t: 'Welcome tab',        sub: 'Extension just installed',     icon: 'sparkle' },
    { flow: 'A', n: 'A·2', t: 'Onboarding popup',   sub: '3‑step tour',                  icon: 'puzzle' },
    { flow: 'A', n: 'A·3', t: 'Idle, ready',        sub: 'Press Start',                  icon: 'record' },
    { flow: 'B-png', n: 'B·1', t: 'Configure mode', sub: 'PNG · cursor on',              icon: 'image' },
    { flow: 'B-png', n: 'B·2', t: 'Record',         sub: 'Click targets captured',       icon: 'cursor' },
    { flow: 'B-png', n: 'B·3', t: 'Stop & review',  sub: 'Encrypted in session',         icon: 'check' },
    { flow: 'E-png', n: 'E·1', t: 'Studio',         sub: 'Timeline + canvas',            icon: 'layers' },
    { flow: 'E-png', n: 'E·2', t: 'Sanitize',       sub: 'Click‑to‑blur PII',            icon: 'eye-off' },
    { flow: 'E-png', n: 'E·3', t: 'Sensitivity',    sub: 'Final checks',                 icon: 'shield' },
    { flow: 'E-png', n: 'E·4', t: 'Download',       sub: 'Saved locally',                icon: 'download' },
  ];
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line)', borderRadius: 14,
      padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>End-to-end storyboard</div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>10 frames · ~2 min flow</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, minmax(0,1fr))',
        gap: 0,
        alignItems: 'stretch',
      }}>
        {frames.map((f, i) => (
          <React.Fragment key={f.n}>
            <button
              onClick={() => onGo(f.flow)}
              style={{
                textAlign: 'left',
                padding: 10, borderRadius: 10,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
                display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="mono" style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                  padding: '2px 5px', borderRadius: 4,
                  background: 'var(--accent)', color: '#fff',
                }}>{f.n}</span>
                <Icon name={f.icon} size={13} stroke="var(--ink-dim)"/>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{f.t}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-mute)', lineHeight: 1.3 }}>{f.sub}</div>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [current, setCurrent] = React.useState(() => {
    try { return localStorage.getItem('vs-flow') || 'overview'; } catch { return 'overview'; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('vs-flow', current); } catch {}
  }, [current]);

  const go = (id) => setCurrent(id);
  const exit = () => setCurrent('overview');

  let view;
  if (current === 'overview')   view = <Overview onGo={go}/>;
  else if (current === 'A')     view = <FlowA onExit={exit} onGoToFlowB={() => go('B-png')}/>;
  else if (current === 'B-png') view = <FlowB onExit={exit} mode="png" onGoToFlowE={(m, s) => go(m === 'svg' ? 'E-svg' : 'E-png')}/>;
  else if (current === 'B-svg') view = <FlowB onExit={exit} mode="svg" onGoToFlowE={(m, s) => go(m === 'svg' ? 'E-svg' : 'E-png')}/>;
  else if (current === 'E-png') view = <FlowE onExit={exit} mode="png" stepsCount={4}/>;
  else if (current === 'E-svg') view = <FlowE onExit={exit} mode="svg" stepsCount={4}/>;
  else if (current === 'F')     view = <FlowF onExit={exit} stepsCount={4}/>;

  return (
    <div style={appStyles.root}>
      <aside style={appStyles.rail}>
        <div style={appStyles.railHead}>
          <Icon name="logo" size={28}/>
          <div>
            <div style={appStyles.railName}>VectoSnap</div>
            <div style={appStyles.railSub}>Happy path · v0.1</div>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--ink-mute)', padding: '0 4px' }}>
          Flows
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FLOWS.map(f => (
            <button
              key={f.id}
              onClick={() => setCurrent(f.id)}
              style={appStyles.flowBtn(current === f.id)}
            >
              <span style={appStyles.flowChip(current === f.id)}>{f.code}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: current === f.id ? 'var(--accent-ink)' : 'var(--ink)' }}>{f.title}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-mute)', marginTop: 1 }}>{f.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6 }}>
            Scope
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: 'var(--ink-dim)' }}>
            <li style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'oklch(0.34 0.1 155)' }}>●</span> PNG chain capture
            </li>
            <li style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'oklch(0.34 0.1 155)' }}>●</span> Layered SVG capture
            </li>
            <li style={{ display: 'flex', gap: 6, opacity: 0.7 }}>
              <span style={{ color: 'var(--ink-mute)' }}>○</span> Global propagation (future)
            </li>
            <li style={{ display: 'flex', gap: 6, opacity: 0.7 }}>
              <span style={{ color: 'var(--ink-mute)' }}>○</span> PII studio advanced (future)
            </li>
          </ul>
        </div>
      </aside>
      <main style={appStyles.stage}>{view}</main>
    </div>
  );
}

Object.assign(window, { FlowShell, FlowSteps, FlowHint });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
