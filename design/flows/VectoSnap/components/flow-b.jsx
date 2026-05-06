// Flow B — Record a workflow
// Popup → host page → click targets → stop → "open Studio" CTA.
// User picks PNG or SVG mode; recording UX is identical, only the mode chip differs.

function FlowB({ onExit, onGoToFlowE, mode: initialMode = 'png' }) {
  // Phases: 'configure' | 'recording' | 'stopped'
  const [phase, setPhase] = React.useState('configure');
  const [mode, setMode] = React.useState(initialMode);
  const [cursor, setCursor] = React.useState(true);
  const [popupOpen, setPopupOpen] = React.useState(true);
  const [steps, setSteps] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [hostScreen, setHostScreen] = React.useState('queue');
  const [clickBurst, setClickBurst] = React.useState(null); // {x,y,key}
  const [recentAction, setRecentAction] = React.useState(null);

  // Timer
  React.useEffect(() => {
    if (phase !== 'recording' || paused) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  const startRecording = () => {
    setPhase('recording');
    setElapsed(0);
    setSteps(0);
    setHostScreen('queue');
    setPopupOpen(false);
  };

  const stopRecording = () => {
    setPhase('stopped');
    setPopupOpen(true);
  };

  // User click on a capture target in the host
  const captureClick = (label, e, advanceToDetail = false) => {
    if (phase !== 'recording' || paused) return;
    const rect = e?.currentTarget?.getBoundingClientRect();
    const parent = e?.currentTarget?.closest('[data-stage]')?.getBoundingClientRect();
    if (rect && parent) {
      setClickBurst({
        x: rect.left - parent.left + rect.width / 2,
        y: rect.top - parent.top + rect.height / 2,
        key: Date.now(),
      });
      setTimeout(() => setClickBurst(null), 900);
    }
    setSteps(s => s + 1);
    setRecentAction({ text: label, key: Date.now() });
    setTimeout(() => setRecentAction((a) => (a && a.key === Date.now()) ? null : a), 2200);
    if (advanceToDetail) setTimeout(() => setHostScreen('detail'), 220);
  };

  const tabs = [{
    title: 'Quality System — Audits', active: true,
    favicon: <div style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg, #2a3854, #0e1524)' }}/>,
  }];

  // Overlay: recording pill docked to top-right of viewport
  const recordingPill = phase === 'recording' && (
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px 7px 12px', borderRadius: 999,
      background: '#1d2230', color: '#fff',
      boxShadow: '0 10px 30px rgba(15,20,35,.25)',
      fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif",
      pointerEvents: 'auto',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.58 0.19 25)',
        animation: paused ? 'none' : 'vs-pulse-in 1.2s ease-in-out infinite',
      }}/>
      <span style={{ fontWeight: 600 }}>{paused ? 'Paused' : `Recording · ${mode.toUpperCase()}`}</span>
      <span className="mono" style={{ opacity: 0.6 }}>
        {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
      </span>
      <span style={{
        padding: '2px 7px', borderRadius: 999, background: 'oklch(0.58 0.19 258)',
        fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums',
      }}>{String(steps).padStart(2, '0')} steps</span>
      <button
        onClick={() => setPaused(p => !p)}
        style={{
          color: '#fff', padding: '3px 6px', borderRadius: 6, fontSize: 11,
          border: '1px solid rgba(255,255,255,.18)', marginLeft: 2,
        }}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        onClick={stopRecording}
        style={{
          color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: 'oklch(0.58 0.19 25)',
        }}>
        Stop
      </button>
    </div>
  );

  // Recent-action toast — the auto-generated "Clicked X" step log entry
  const actionToast = recentAction && (
    <div key={recentAction.key} style={{
      position: 'absolute', bottom: 18, right: 18, zIndex: 40,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 8,
      background: '#1d2230', color: '#fff',
      fontSize: 12, boxShadow: '0 10px 30px rgba(15,20,35,.25)',
      animation: 'vs-toast-in 260ms cubic-bezier(.2,.8,.2,1)',
      maxWidth: 320,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: 'oklch(0.58 0.19 258)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="check" size={11} stroke="#fff"/>
      </div>
      <span className="mono" style={{ color: '#9aa3b2', fontSize: 10 }}>step {String(steps).padStart(2, '0')}</span>
      <span>Captured: {recentAction.text}</span>
    </div>
  );

  // Click burst animation over the click target
  const burstOverlay = clickBurst && (
    <div key={clickBurst.key} style={{
      position: 'absolute', left: clickBurst.x, top: clickBurst.y,
      pointerEvents: 'none', zIndex: 35, transform: 'translate(-50%, -50%)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'oklch(0.58 0.19 258 / 0.25)',
        border: '2px solid oklch(0.58 0.19 258)',
        animation: 'vs-burst 800ms ease-out',
      }}/>
      {cursor && (
        <div style={{
          position: 'absolute', top: 4, left: 6, color: 'oklch(0.38 0.14 258)',
        }}>
          <Icon name="cursor" size={14} stroke="oklch(0.38 0.14 258)"/>
        </div>
      )}
    </div>
  );

  // Stopped state — CTA sheet above host page
  const stoppedSheet = phase === 'stopped' && (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 45,
      background: 'rgba(15, 20, 35, .35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'vs-fade-in 200ms ease-out',
    }}>
      <div style={{
        width: 440, background: '#fff', borderRadius: 14,
        boxShadow: '0 40px 80px rgba(15,20,35,.25)', padding: 22,
        animation: 'vs-popin 240ms cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 12,
          background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={22} stroke="oklch(0.34 0.1 155)"/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>Recording saved locally.</div>
        <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4, lineHeight: 1.5 }}>
          {steps} steps · {Math.floor(elapsed / 60)}m {elapsed % 60}s · {mode.toUpperCase()} chain · encrypted in session storage.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '16px 0 14px' }}>
          <MiniStat label="Steps"   value={String(steps).padStart(2, '0')}/>
          <MiniStat label="Duration" value={`${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}/>
          <MiniStat label="Size"    value={`${(steps * 0.18).toFixed(1)} MB`}/>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onGoToFlowE && onGoToFlowE(mode, steps)}
            style={{
              flex: 1.4, padding: '11px', borderRadius: 10,
              background: 'oklch(0.58 0.19 258)', color: '#fff',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name="sparkle" size={14}/> Review & export in Studio
          </button>
          <button
            onClick={onExit}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              background: '#fff', color: '#454c5a', border: '1px solid oklch(0.92 0.008 258)',
              fontSize: 13, fontWeight: 500,
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );

  const popupNode = phase === 'configure'
    ? (
      <PopupIdle
        mode={mode} onMode={setMode}
        cursor={cursor} onCursor={setCursor}
        onStart={startRecording}
        emphasizeRecord={false}
      />
    )
    : (
      <PopupRecording
        mode={mode} cursor={cursor}
        steps={steps} elapsed={elapsed}
        paused={paused}
        onPause={() => setPaused(p => !p)}
        onStop={stopRecording}
      />
    );

  return (
    <FlowShell
      title={`Flow B — Record a workflow (${mode.toUpperCase()})`}
      onExit={onExit}
      rightControls={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6a7180' }}>Capture mode:</span>
          <ModeSwitch mode={mode} onChange={setMode} disabled={phase !== 'configure'}/>
        </div>
      }
    >
      <BrowserWindow
        tabs={tabs}
        url="auditworks.example/audits"
        extensionActive={true}
        recording={phase === 'recording'}
        onExtensionClick={() => setPopupOpen(o => !o)}
        popupOpen={popupOpen}
        popupNode={popupNode}
        overlayNode={<>{recordingPill}{actionToast}{burstOverlay}{stoppedSheet}</>}
      >
        <div data-stage style={{ width: '100%', height: '100%', position: 'relative' }}>
          <HostApp
            screen={hostScreen}
            onOpenAudit={(e) => captureClick('button "Open" in row AUD-4829', e, true)}
            onApprove={(e) => captureClick('button "Approve audit"', e)}
            highlight={phase === 'recording' ? (hostScreen === 'queue' ? 'open-btn' : 'approve') : null}
          />
          {/* Subtle recording frame */}
          {phase === 'recording' && !paused && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              boxShadow: 'inset 0 0 0 3px oklch(0.58 0.19 25 / 0.7)',
              animation: 'vs-rec-frame 2s ease-in-out infinite',
            }}/>
          )}
        </div>
      </BrowserWindow>

      <FlowSteps
        steps={['Configure', 'Start', 'Click step 1', 'Click step 2', 'Stop', 'Review']}
        active={phase === 'configure' ? 0 : phase === 'stopped' ? 5 : Math.min(1 + steps, 4)}
      />

      {/* Live guidance */}
      {phase === 'recording' && steps === 0 && (
        <FlowHint>
          Click the highlighted <strong>Open</strong> button on audit <span className="mono">AUD‑4829</span> to capture your first step.
        </FlowHint>
      )}
      {phase === 'recording' && steps === 1 && hostScreen === 'detail' && (
        <FlowHint>
          Good — step 1 captured. Now click <strong>Approve audit</strong> to capture the final click.
        </FlowHint>
      )}
      {phase === 'recording' && steps >= 2 && (
        <FlowHint>
          You can stop anytime. Click <strong>Stop</strong> in the toolbar pill or popup to review your capture in Studio.
        </FlowHint>
      )}

      <style>{`
        @keyframes vs-rec-frame { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes vs-burst {
          0%   { transform: scale(0.3); opacity: 1 }
          100% { transform: scale(2.6); opacity: 0 }
        }
        @keyframes vs-toast-in {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes vs-fade-in { from{opacity:0} to{opacity:1} }
      `}</style>
    </FlowShell>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: 'oklch(0.985 0.005 250)', border: '1px solid oklch(0.93 0.006 250)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#6a7180', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: '#1d2230', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function ModeSwitch({ mode, onChange, disabled }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: '#eef1f5', borderRadius: 999, padding: 3,
      opacity: disabled ? 0.5 : 1,
    }}>
      {[{ id: 'png', label: 'PNG chain' }, { id: 'svg', label: 'Layered SVG' }].map(m => (
        <button key={m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
          style={{
            padding: '5px 12px', borderRadius: 999, fontSize: 12,
            fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
            background: mode === m.id ? '#fff' : 'transparent',
            color: mode === m.id ? '#1d2230' : '#6a7180',
            boxShadow: mode === m.id ? '0 1px 3px rgba(15,20,35,.1)' : 'none',
          }}>{m.label}</button>
      ))}
    </div>
  );
}

Object.assign(window, { FlowB, ModeSwitch });
