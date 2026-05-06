// Flow E — Review in Studio + Export
// Tabs: chrome-extension://…/editor.html (Studio)
// Happy path: arrive with captured session → optionally blur PII → pick format → sensitivity warning → download.

function FlowE({ onExit, mode: initialMode = 'png', stepsCount = 4 }) {
  const [mode, setMode] = React.useState(initialMode);
  const [activeStep, setActiveStep] = React.useState(0);
  const [blurMode, setBlurMode] = React.useState(false);
  const [blurTargetsByStep, setBlurTargetsByStep] = React.useState({});
  const [selectedFormat, setSelectedFormat] = React.useState(initialMode === 'svg' ? 'svg-zip' : 'png-zip');
  const [phase, setPhase] = React.useState('review'); // review | warning | exporting | done
  const [progress, setProgress] = React.useState(0);

  const tabs = [
    { title: 'Quality System — Audits', active: false,
      favicon: <div style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg, #2a3854, #0e1524)' }}/> },
    { title: 'VectoSnap Studio', active: true,
      favicon: <div style={{ width: 14, height: 14, display: 'flex' }}><Icon name="logo" size={14}/></div> },
  ];

  const toggleBlur = (id) => {
    setBlurTargetsByStep(prev => {
      const cur = prev[activeStep] || [];
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      return { ...prev, [activeStep]: next };
    });
  };

  const startExport = () => {
    setPhase('exporting');
    setProgress(0);
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setTimeout(() => setPhase('done'), 250); return 100; }
        return p + (5 + Math.random() * 10);
      });
    }, 120);
  };

  const currentBlurTargets = blurTargetsByStep[activeStep] || [];
  const totalBlurred = Object.values(blurTargetsByStep).reduce((s, arr) => s + arr.length, 0);

  return (
    <FlowShell
      title={`Flow E — Review & export (${mode.toUpperCase()})`}
      onExit={onExit}
      rightControls={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6a7180' }}>Source:</span>
          <ModeSwitch mode={mode} onChange={(m) => { setMode(m); setSelectedFormat(m === 'svg' ? 'svg-zip' : 'png-zip'); }}/>
        </div>
      }
    >
      <BrowserWindow tabs={tabs} url="chrome-extension://…/editor.html#session=cs_7fQ2">
        <div style={studioStyles.root}>
          {/* Top bar */}
          <div style={studioStyles.top}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="logo" size={22}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>VectoSnap Studio</div>
            </div>
            <div style={{ width: 1, height: 22, background: '#e4e7ed' }}/>
            <div style={{ fontSize: 13, color: '#2a303e' }}>
              <span style={{ color: '#6a7180' }}>Session · </span>
              <span className="mono" style={{ fontWeight: 600 }}>cs_7fQ2 · {mode.toUpperCase()} chain</span>
              <span style={{ color: '#6a7180' }}> · {stepsCount} steps</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 999,
                background: 'oklch(0.96 0.04 155)', color: 'oklch(0.34 0.1 155)',
                fontSize: 11, fontWeight: 600,
              }}>
                <Icon name="shield-check" size={12} stroke="oklch(0.34 0.1 155)"/>
                Zero‑egress · AES‑GCM at rest
              </div>
              <button style={{
                padding: '7px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                color: '#8a2a22', border: '1px solid oklch(0.86 0.06 25)', background: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Icon name="trash" size={13}/> Purge memory
              </button>
            </div>
          </div>

          {/* Left nav */}
          <div style={studioStyles.nav}>
            <button style={studioStyles.navBtn(true)}  title="Review"><Icon name="layers" size={18}/></button>
            <button style={studioStyles.navBtn(false)} title="PII studio"><Icon name="eye-off" size={18}/></button>
            <button style={studioStyles.navBtn(false)} title="Design system"><Icon name="grid" size={18}/></button>
            <button style={studioStyles.navBtn(false)} title="Action log"><Icon name="html" size={18}/></button>
            <div style={{ flex: 1 }}/>
            <button style={studioStyles.navBtn(false)} title="Settings"><Icon name="settings" size={18}/></button>
          </div>

          {/* Canvas */}
          <CanvasStage
            activeStep={activeStep}
            blurTargets={currentBlurTargets}
            onBlurTarget={toggleBlur}
            blurMode={blurMode}
          />

          {/* Inspector */}
          <div style={studioStyles.inspector}>
            <div style={studioStyles.inspTabs}>
              <div style={studioStyles.inspTab(true)}>Export</div>
              <div style={studioStyles.inspTab(false)}>Sanitize</div>
              <div style={studioStyles.inspTab(false)}>Step log</div>
            </div>
            <div style={studioStyles.inspBody}>
              <ExportPanel
                mode={mode}
                selected={selectedFormat}
                onSelect={setSelectedFormat}
                onExport={() => setPhase('warning')}
                totalBlurred={totalBlurred}
                stepsCount={stepsCount}
              />
              <div style={{ height: 14 }}/>
              <SanitizeMini
                active={blurMode}
                onToggle={() => setBlurMode(b => !b)}
                blurred={currentBlurTargets.length}
                stepLabel={CAPTURED_STEPS[activeStep]?.label}
              />
            </div>
          </div>

          {/* Timeline */}
          <Timeline
            steps={CAPTURED_STEPS.slice(0, stepsCount)}
            active={activeStep}
            onSelect={setActiveStep}
            blurStep={Object.keys(blurTargetsByStep).find(k => (blurTargetsByStep[k] || []).length > 0)
              ? parseInt(Object.keys(blurTargetsByStep).find(k => (blurTargetsByStep[k] || []).length > 0))
              : null}
            blurTargets={Object.values(blurTargetsByStep).flat()}
          />
        </div>

        {/* Export sensitivity warning */}
        {phase === 'warning' && (
          <Modal onClose={() => setPhase('review')}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'oklch(0.96 0.08 80)', color: 'oklch(0.48 0.16 80)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="shield" size={20} stroke="oklch(0.48 0.16 80)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Before you export</div>
                <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4, lineHeight: 1.5 }}>
                  Captured content may contain sensitive data. VectoSnap never transmits, but you are responsible for how the exported file is stored and shared.
                </div>

                <ul style={{ marginTop: 14, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <WarningCheck ok label={`${totalBlurred} element${totalBlurred === 1 ? '' : 's'} redacted`} detail={totalBlurred > 0 ? 'Blur applied to flagged regions.' : 'No PII sanitization applied. Review before sharing.'}/>
                  <WarningCheck ok label="Password fields masked" detail="rrweb maskInputOptions.password is enabled."/>
                  <WarningCheck ok label="File destination is local disk" detail="Saved via local Blob + URL.createObjectURL()."/>
                </ul>

                <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, fontSize: 12, color: '#454c5a' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'oklch(0.58 0.19 258)' }}/>
                  I've reviewed the captured steps for sensitive data.
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPhase('review')}
                    style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, color: '#454c5a', border: '1px solid oklch(0.92 0.008 258)', background: '#fff' }}>
                    Back to review
                  </button>
                  <button
                    onClick={startExport}
                    style={{
                      padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'oklch(0.58 0.19 258)', color: '#fff',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    <Icon name="download" size={14} stroke="#fff"/>
                    Export locally
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Export progress */}
        {phase === 'exporting' && (
          <Modal narrow>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Exporting {selectedFormat.replace('-', ' ').toUpperCase()}…</div>
            <div style={{ fontSize: 12, color: '#6a7180', marginTop: 3 }}>
              Packaging {stepsCount} step{stepsCount === 1 ? '' : 's'} locally.
            </div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#eef1f5', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, progress)}%`, height: '100%',
                background: 'oklch(0.58 0.19 258)',
                transition: 'width 120ms linear',
              }}/>
            </div>
            <div className="mono" style={{ fontSize: 11, color: '#8a919e', marginTop: 8 }}>
              {Math.min(100, Math.floor(progress))}% · {(progress / 100 * stepsCount * 0.18).toFixed(1)} / {(stepsCount * 0.18).toFixed(1)} MB
            </div>
          </Modal>
        )}

        {/* Done */}
        {phase === 'done' && (
          <Modal onClose={() => setPhase('review')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="check" size={22} stroke="oklch(0.34 0.1 155)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Exported to Downloads</div>
                <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4 }}>
                  Saved locally. No network traffic occurred.
                </div>
                <div style={{
                  marginTop: 14, padding: '12px 14px',
                  borderRadius: 10, background: 'oklch(0.985 0.005 250)',
                  border: '1px solid oklch(0.93 0.006 250)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#1d2230', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {selectedFormat.includes('svg') ? 'SVG' : selectedFormat.includes('png') ? 'PNG' : 'ZIP'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileNameFor(selectedFormat, stepsCount)}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: '#8a919e', marginTop: 2 }}>
                      {(stepsCount * 0.18).toFixed(1)} MB · ~/Downloads
                    </div>
                  </div>
                  <button style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: '#1d2230', color: '#fff',
                  }}>Show in folder</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={onExit}
                    style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, color: '#454c5a', border: '1px solid oklch(0.92 0.008 258)', background: '#fff' }}>
                    Back to flows
                  </button>
                  <button onClick={() => setPhase('review')}
                    style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'oklch(0.58 0.19 258)', color: '#fff' }}>
                    Export another format
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </BrowserWindow>

      <FlowSteps
        steps={['Open Studio', 'Review steps', 'Sanitize', 'Pick format', 'Confirm', 'Download']}
        active={
          phase === 'done' ? 5 :
          phase === 'exporting' ? 4 :
          phase === 'warning' ? 4 :
          blurMode ? 2 : 1
        }
      />
    </FlowShell>
  );
}

function fileNameFor(f, steps) {
  const d = '2026-04-18';
  if (f === 'png-zip')   return `vectosnap_${d}_png-chain_${steps}steps.zip`;
  if (f === 'svg-zip')   return `vectosnap_${d}_svg-layers_${steps}steps.zip`;
  if (f === 'html')      return `vectosnap_${d}_replay.html`;
  if (f === 'video')     return `vectosnap_${d}_capture.webm`;
  if (f === 'markdown')  return `vectosnap_${d}_design-system.zip`;
  return `vectosnap_${d}.zip`;
}

const EXPORT_FORMATS = [
  { id: 'png-zip',  icon: 'image',    title: 'PNG chain',   desc: 'ZIP of sequential screenshots.', pref: ['png'] },
  { id: 'svg-zip',  icon: 'svg',      title: 'SVG layers',  desc: 'ZIP · per-step layered SVGs.', pref: ['svg'] },
  { id: 'html',     icon: 'html',     title: 'HTML replay', desc: 'Self-contained rrweb replay.' },
  { id: 'video',    icon: 'video',    title: 'Video',       desc: 'Trimmed WebM.' },
  { id: 'markdown', icon: 'folder',   title: 'Design system (MD)', desc: 'MASTER.md + page overrides.' },
  { id: 'pptx',     icon: 'layers',   title: 'PPTX',        desc: 'Step guide as slides.' },
];

function ExportPanel({ mode, selected, onSelect, onExport, totalBlurred, stepsCount }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
          color: '#6a7180',
        }}>Export format</span>
        <span className="mono" style={{ fontSize: 10, color: '#8a919e' }}>
          {stepsCount} steps · {(stepsCount * 0.18).toFixed(1)} MB
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EXPORT_FORMATS.map(f => {
          const active = selected === f.id;
          const recommended = f.pref && f.pref.includes(mode);
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 11px', borderRadius: 10,
                border: active ? '1.5px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.93 0.006 258)',
                background: active ? 'oklch(0.97 0.035 258)' : '#fff',
                textAlign: 'left', cursor: 'pointer', transition: 'all 140ms',
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: active ? 'oklch(0.58 0.19 258)' : '#eef1f5',
                color: active ? '#fff' : '#454c5a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={f.icon} size={14} stroke={active ? '#fff' : '#454c5a'}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</span>
                  {recommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                      padding: '2px 5px', borderRadius: 4,
                      background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)',
                    }}>RECOMMENDED</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#6a7180', marginTop: 1 }}>{f.desc}</div>
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: active ? '5px solid oklch(0.58 0.19 258)' : '1.5px solid #c8cdd5',
                background: '#fff',
                flexShrink: 0,
              }}/>
            </button>
          );
        })}
      </div>
      <button
        onClick={onExport}
        style={{
          width: '100%', marginTop: 14, padding: '11px', borderRadius: 10,
          background: 'oklch(0.58 0.19 258)', color: '#fff',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        <Icon name="download" size={14} stroke="#fff"/>
        Export {EXPORT_FORMATS.find(f => f.id === selected).title}
      </button>
      {totalBlurred > 0 && (
        <div className="mono" style={{ fontSize: 10, color: '#8a919e', textAlign: 'center', marginTop: 8 }}>
          {totalBlurred} region{totalBlurred === 1 ? '' : 's'} sanitized across timeline
        </div>
      )}
    </div>
  );
}

function SanitizeMini({ active, onToggle, blurred, stepLabel }) {
  return (
    <div style={{
      background: active ? 'oklch(0.97 0.035 258)' : 'oklch(0.985 0.005 250)',
      border: active ? '1.5px solid oklch(0.78 0.1 258)' : '1px solid oklch(0.93 0.006 258)',
      borderRadius: 10, padding: 12, transition: 'all 160ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="eye-off" size={14} stroke={active ? 'oklch(0.38 0.14 258)' : '#6a7180'}/>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'oklch(0.38 0.14 258)' : '#1d2230' }}>
          Click‑to‑blur on canvas
        </div>
        <button
          onClick={onToggle}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: active ? 'oklch(0.58 0.19 258)' : '#fff',
            color: active ? '#fff' : '#454c5a',
            border: active ? 'none' : '1px solid oklch(0.9 0.008 258)',
          }}>{active ? 'Active' : 'Enable'}</button>
      </div>
      <div style={{ fontSize: 11, color: '#6a7180', marginTop: 6, lineHeight: 1.4 }}>
        {active
          ? <>Click any highlighted region on the canvas to redact it. <span style={{ color: '#1d2230', fontWeight: 600 }}>{blurred}</span> on {stepLabel || 'this step'}.</>
          : 'Enable to reveal PII regions detected on the current step.'}
      </div>
    </div>
  );
}

function WarningCheck({ ok, label, detail }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: ok ? 'oklch(0.94 0.08 155)' : 'oklch(0.96 0.035 25)',
        color: ok ? 'oklch(0.34 0.1 155)' : 'oklch(0.42 0.18 25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={ok ? 'check' : 'x'} size={12} stroke="currentColor"/>
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#1d2230' }}>{label}</div>
        <div style={{ color: '#6a7180', marginTop: 1 }}>{detail}</div>
      </div>
    </li>
  );
}

function Modal({ children, onClose, narrow }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'rgba(15, 20, 35, .36)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'vs-fade-in 180ms ease-out',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: narrow ? 360 : 520, maxWidth: '92%',
          background: '#fff', borderRadius: 14, padding: 22,
          boxShadow: '0 40px 80px rgba(15,20,35,.25)',
          animation: 'vs-popin 220ms cubic-bezier(.2,.8,.2,1)',
        }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { FlowE });
