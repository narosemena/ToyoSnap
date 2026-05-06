// Flow F — Redaction primitives deep-dive on the PNG chain.
// Studio is opened on the "PII studio" tab, 3 regions auto-flagged by the local PII scanner.
// Per-region primitive inspector lets you pick method (blur / pixelate / black-bar) and dial params;
// the canvas re-renders live, the export panel shows the per-region breakdown, and the sensitivity
// warning + download card show exactly what was baked into the PNG chain.

const FLOW_F_REGIONS = [
  {
    id: 'r-name',
    label: 'Customer name',
    kind: 'Name (PII)',
    rect: { left: 600, top: 366, width: 176, height: 22 },
    sample: 'Jordan Whitfield',
    primitive: 'blur',
    blurPx: 8,
    cell: 6,
    ink: 'black',
    persist: true,
  },
  {
    id: 'r-email',
    label: 'Customer email',
    kind: 'Email (PII)',
    rect: { left: 600, top: 388, width: 234, height: 22 },
    sample: 'jwhitfield@contoso-example.com',
    primitive: 'pixelate',
    blurPx: 8,
    cell: 7,
    ink: 'black',
    persist: true,
  },
  {
    id: 'r-phone',
    label: 'Phone number',
    kind: 'Phone (PII)',
    rect: { left: 600, top: 410, width: 140, height: 22 },
    sample: '(415) 555‑0198',
    primitive: 'redact',
    blurPx: 8,
    cell: 6,
    ink: 'black',
    persist: true,
  },
];

const PRIMITIVE_META = {
  blur:     { label: 'Gaussian blur',  mono: 'blur(Npx)',            tint: 'oklch(0.58 0.19 258)' },
  pixelate: { label: 'Pixelate',       mono: 'mosaic(cell=Npx)',     tint: 'oklch(0.52 0.17 300)' },
  redact:   { label: 'Black-bar',      mono: 'fill(ink)',            tint: 'oklch(0.22 0.02 255)' },
};

function FlowF({ onExit }) {
  const [regions, setRegions] = React.useState(FLOW_F_REGIONS);
  const [activeId, setActiveId] = React.useState('r-name');
  const [activeStep, setActiveStep] = React.useState(1); // detail screen
  const [phase, setPhase] = React.useState('edit'); // edit | warning | exporting | done
  const [progress, setProgress] = React.useState(0);
  const [selectedFormat] = React.useState('png-zip');
  const stepsCount = 4;

  const active = regions.find(r => r.id === activeId);

  const updateActive = (patch) => {
    setRegions(rs => rs.map(r => r.id === activeId ? { ...r, ...patch } : r));
  };

  const startExport = () => {
    setPhase('exporting');
    setProgress(0);
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setTimeout(() => setPhase('done'), 250); return 100; }
        return p + (5 + Math.random() * 9);
      });
    }, 110);
  };

  const tabs = [
    { title: 'Quality System — Audits', active: false,
      favicon: <div style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg, #2a3854, #0e1524)' }}/> },
    { title: 'VectoSnap Studio', active: true,
      favicon: <div style={{ width: 14, height: 14, display: 'flex' }}><Icon name="logo" size={14}/></div> },
  ];

  return (
    <FlowShell
      title="Flow F — Redaction primitives (PNG chain)"
      onExit={onExit}
      rightControls={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '4px 9px', borderRadius: 999,
            background: 'oklch(0.96 0.08 80)', color: 'oklch(0.48 0.16 80)',
            fontSize: 11, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <Icon name="eye-off" size={11} stroke="oklch(0.48 0.16 80)"/>
            3 PII regions detected
          </div>
        </div>
      }
    >
      <BrowserWindow tabs={tabs} url="chrome-extension://…/editor.html#session=cs_7fQ2&tab=pii">
        <div style={studioStyles.root}>
          <div style={studioStyles.top}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="logo" size={22}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>VectoSnap Studio</div>
            </div>
            <div style={{ width: 1, height: 22, background: '#e4e7ed' }}/>
            <div style={{ fontSize: 13, color: '#2a303e' }}>
              <span style={{ color: '#6a7180' }}>Session · </span>
              <span className="mono" style={{ fontWeight: 600 }}>cs_7fQ2 · PNG chain · {stepsCount} steps</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 999,
                background: 'oklch(0.96 0.04 155)', color: 'oklch(0.34 0.1 155)',
                fontSize: 11, fontWeight: 600,
              }}>
                <Icon name="shield-check" size={12} stroke="oklch(0.34 0.1 155)"/>
                Redactions baked into raster output
              </div>
            </div>
          </div>

          <div style={studioStyles.nav}>
            <button style={studioStyles.navBtn(false)} title="Review"><Icon name="layers" size={18}/></button>
            <button style={studioStyles.navBtn(true)}  title="PII studio"><Icon name="eye-off" size={18}/></button>
            <button style={studioStyles.navBtn(false)} title="Design system"><Icon name="grid" size={18}/></button>
            <button style={studioStyles.navBtn(false)} title="Action log"><Icon name="html" size={18}/></button>
            <div style={{ flex: 1 }}/>
            <button style={studioStyles.navBtn(false)} title="Settings"><Icon name="settings" size={18}/></button>
          </div>

          {/* Canvas — PII studio mode: shows the detail screen with live-previewed redactions */}
          <RedactionCanvas
            step={CAPTURED_STEPS[activeStep]}
            regions={regions}
            activeId={activeId}
            onActivate={setActiveId}
            stepsCount={stepsCount}
          />

          {/* Inspector — primitive controls for the active region */}
          <div style={studioStyles.inspector}>
            <div style={studioStyles.inspTabs}>
              <div style={studioStyles.inspTab(false)}>Export</div>
              <div style={studioStyles.inspTab(true)}>Redaction</div>
              <div style={studioStyles.inspTab(false)}>Step log</div>
            </div>
            <div style={studioStyles.inspBody}>
              <PrimitiveInspector
                region={active}
                onChange={updateActive}
              />
              <div style={{ height: 14 }}/>
              <RegionList
                regions={regions}
                activeId={activeId}
                onSelect={setActiveId}
              />
              <div style={{ height: 14 }}/>
              <button
                onClick={() => setPhase('warning')}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10,
                  background: 'oklch(0.58 0.19 258)', color: '#fff',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Icon name="download" size={14} stroke="#fff"/>
                Export PNG chain
              </button>
              <div className="mono" style={{ fontSize: 10, color: '#8a919e', textAlign: 'center', marginTop: 8 }}>
                {regions.length} region{regions.length === 1 ? '' : 's'} · baked pre-encode
              </div>
            </div>
          </div>

          {/* Timeline with per-step redaction markers */}
          <RedactionTimeline
            steps={CAPTURED_STEPS.slice(0, stepsCount)}
            active={activeStep}
            onSelect={setActiveStep}
            regions={regions}
          />
        </div>

        {phase === 'warning' && (
          <Modal onClose={() => setPhase('edit')}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="shield-check" size={20} stroke="oklch(0.34 0.1 155)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Exporting with {regions.length} redactions</div>
                <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4, lineHeight: 1.5 }}>
                  Each region below is baked into the raster output before the ZIP is packaged. The unredacted pixels never leave Studio.
                </div>

                <div style={{
                  marginTop: 14, borderRadius: 10,
                  border: '1px solid oklch(0.93 0.006 258)', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '8px 12px', background: 'oklch(0.985 0.005 250)',
                    display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 80px',
                    fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
                    color: '#6a7180', gap: 10,
                  }}>
                    <div>Region</div>
                    <div>Method</div>
                    <div>Params</div>
                    <div>Preview</div>
                  </div>
                  {regions.map(r => (
                    <div key={r.id} style={{
                      padding: '9px 12px', borderTop: '1px solid oklch(0.95 0.006 258)',
                      display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 80px',
                      alignItems: 'center', gap: 10, fontSize: 12.5,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: '#8a919e' }}>{r.kind}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PrimitiveDot primitive={r.primitive}/>
                        <span>{PRIMITIVE_META[r.primitive].label}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: '#454c5a' }}>
                        {paramText(r)}
                      </div>
                      <PrimitivePreview region={r} width={72} height={22}/>
                    </div>
                  ))}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, fontSize: 12, color: '#454c5a' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'oklch(0.58 0.19 258)' }}/>
                  Apply the same redactions to every step where these regions appear.
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPhase('edit')}
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
                    Bake &amp; download
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {phase === 'exporting' && (
          <Modal narrow>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Baking redactions…</div>
            <div style={{ fontSize: 12, color: '#6a7180', marginTop: 3 }}>
              Rasterizing {stepsCount} frames with {regions.length} regions each.
            </div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#eef1f5', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, progress)}%`, height: '100%',
                background: 'oklch(0.58 0.19 258)',
                transition: 'width 110ms linear',
              }}/>
            </div>
            <div className="mono" style={{ fontSize: 11, color: '#8a919e', marginTop: 8 }}>
              {Math.min(100, Math.floor(progress))}% · {bakeStepLabel(progress, regions)}
            </div>
          </Modal>
        )}

        {phase === 'done' && (
          <Modal onClose={() => setPhase('edit')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'oklch(0.94 0.08 155)', color: 'oklch(0.34 0.1 155)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="check" size={22} stroke="oklch(0.34 0.1 155)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Exported with {regions.length} redactions baked</div>
                <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4 }}>
                  Saved locally. Unredacted pixels never left Studio.
                </div>

                {/* Download card with a real baked preview strip */}
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
                  }}>ZIP</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      vectosnap_2026-04-18_png-chain_redacted_{stepsCount}steps.zip
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

                {/* Inline thumbnail of step 02 with redactions baked — this is what ships */}
                <div style={{
                  marginTop: 12,
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid oklch(0.93 0.006 258)',
                  background: '#fff',
                }}>
                  <div style={{
                    padding: '7px 11px', background: 'oklch(0.985 0.005 250)',
                    borderBottom: '1px solid oklch(0.95 0.006 258)',
                    fontSize: 11, color: '#6a7180', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Icon name="image" size={11}/>
                    <span className="mono">step_02.png</span>
                    <span style={{ marginLeft: 'auto' }}>baked output · 820×480</span>
                  </div>
                  <div style={{ padding: 10, background: '#eef0f4' }}>
                    <div style={{
                      width: '100%', aspectRatio: '820 / 220',
                      borderRadius: 6, overflow: 'hidden',
                      position: 'relative',
                      background: '#fff',
                      boxShadow: 'inset 0 0 0 1px oklch(0.93 0.006 258)',
                    }}>
                      <BakedPreviewStrip regions={regions}/>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={onExit}
                    style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, color: '#454c5a', border: '1px solid oklch(0.92 0.008 258)', background: '#fff' }}>
                    Back to flows
                  </button>
                  <button onClick={() => setPhase('edit')}
                    style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'oklch(0.58 0.19 258)', color: '#fff' }}>
                    Tweak redactions
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </BrowserWindow>

      <FlowSteps
        steps={['Open PII studio', 'Pick region', 'Tune primitive', 'Export', 'Confirm', 'Baked PNG chain']}
        active={
          phase === 'done' ? 5 :
          phase === 'exporting' ? 4 :
          phase === 'warning' ? 3 :
          2
        }
      />
    </FlowShell>
  );
}

// ------------------------------------------------------------------
// Canvas — host detail screen with live-redacted regions.
// ------------------------------------------------------------------
function RedactionCanvas({ step, regions, activeId, onActivate, stepsCount }) {
  return (
    <div style={studioStyles.canvasArea}>
      <div style={studioStyles.canvasBar}>
        <span className="mono" style={{ fontSize: 11, color: '#8a919e' }}>
          step {String(step.idx).padStart(2, '0')} / {String(stepsCount).padStart(2, '0')}
        </span>
        <div style={{ width: 1, height: 16, background: '#e4e7ed' }}/>
        <span style={{ color: '#2a303e', fontWeight: 500 }}>{step.label}</span>
        <span style={{
          marginLeft: 12,
          fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
          color: 'oklch(0.38 0.14 258)', background: 'oklch(0.96 0.04 258)',
          padding: '2px 7px', borderRadius: 4,
        }}>PII studio</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: '#8a919e' }}>
          click a highlighted region to edit its primitive
        </span>
      </div>
      <div style={studioStyles.canvas}>
        <div style={studioStyles.stage}>
          <HostApp screen="detail" highlight={null}/>

          {/* Redaction overlays — baked preview sits on top of the detail screen */}
          {regions.map(r => (
            <RegionOverlay
              key={r.id}
              region={r}
              active={r.id === activeId}
              onClick={() => onActivate(r.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RegionOverlay({ region, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: region.rect.left, top: region.rect.top,
        width: region.rect.width, height: region.rect.height,
        border: active ? '1.5px solid oklch(0.58 0.19 258)' : '1px dashed oklch(0.72 0.09 258)',
        borderRadius: 3,
        padding: 0,
        background: 'transparent',
        cursor: 'pointer',
        outline: active ? '3px solid oklch(0.96 0.035 258)' : 'none',
        transition: 'all 140ms',
        overflow: 'visible',
      }}
      title={region.label}
    >
      <div style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden', borderRadius: 2,
      }}>
        <PrimitiveFill region={region}/>
      </div>
      {/* Label tab */}
      <span style={{
        position: 'absolute', top: -20, left: -1,
        fontSize: 10, padding: '2px 6px', borderRadius: 4,
        background: active ? 'oklch(0.58 0.19 258)' : '#1d2230',
        color: '#fff', whiteSpace: 'nowrap', fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <PrimitiveDot primitive={region.primitive} small dark/>
        {region.label}
      </span>
    </button>
  );
}

// ------------------------------------------------------------------
// PrimitiveFill — renders the actual blur / pixelate / black-bar treatment
// over the sample text. Matches what bakes to the PNG.
// ------------------------------------------------------------------
function PrimitiveFill({ region }) {
  if (region.primitive === 'redact') {
    return <div style={{
      width: '100%', height: '100%',
      background: region.ink === 'black' ? '#0b0e16' : 'oklch(0.58 0.19 258)',
    }}/>;
  }
  if (region.primitive === 'pixelate') {
    const cell = Math.max(2, region.cell);
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundImage:
          `linear-gradient(90deg, oklch(0.45 0.02 255) 50%, oklch(0.78 0.01 255) 50%),
           linear-gradient(0deg,  oklch(0.45 0.02 255) 50%, oklch(0.78 0.01 255) 50%)`,
        backgroundSize: `${cell * 2}px ${cell * 2}px, ${cell * 2}px ${cell * 2}px`,
        backgroundPosition: '0 0, 0 0',
        mixBlendMode: 'multiply',
        filter: 'contrast(0.9)',
      }}/>
    );
  }
  // blur — render the sample text actually blurred behind a white scrim
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', paddingLeft: 4,
        fontSize: 12, color: '#1d2230',
        fontFamily: "'Inter',system-ui,sans-serif",
        filter: `blur(${region.blurPx}px)`,
        whiteSpace: 'nowrap',
      }}>
        {region.sample}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// PrimitiveInspector — per-region controls
// ------------------------------------------------------------------
function PrimitiveInspector({ region, onChange }) {
  if (!region) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
          color: '#6a7180',
        }}>Redaction primitive</span>
        <span className="mono" style={{ fontSize: 10, color: '#8a919e' }}>
          {region.label.toLowerCase()}
        </span>
      </div>

      {/* Primitive picker — 3 segmented tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
      }}>
        {['blur', 'pixelate', 'redact'].map(p => {
          const active = region.primitive === p;
          return (
            <button
              key={p}
              onClick={() => onChange({ primitive: p })}
              style={{
                padding: '9px 6px 7px', borderRadius: 10,
                border: active ? '1.5px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.93 0.006 258)',
                background: active ? 'oklch(0.97 0.035 258)' : '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all 140ms',
              }}
            >
              {/* tiny preview swatch */}
              <div style={{
                width: '100%', height: 22, borderRadius: 4, overflow: 'hidden',
                border: '1px solid oklch(0.93 0.006 258)',
              }}>
                <PrimitiveFill region={{ ...region, primitive: p }}/>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: active ? 'oklch(0.38 0.14 258)' : '#454c5a' }}>
                {PRIMITIVE_META[p].label.split(' ')[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Param controls — swap per primitive */}
      <div style={{
        marginTop: 12,
        padding: 11,
        background: 'oklch(0.985 0.005 250)',
        border: '1px solid oklch(0.93 0.006 258)',
        borderRadius: 10,
      }}>
        {region.primitive === 'blur' && (
          <Slider
            label="Blur radius"
            value={region.blurPx}
            min={2} max={20} step={1} unit="px"
            onChange={(v) => onChange({ blurPx: v })}
          />
        )}
        {region.primitive === 'pixelate' && (
          <Slider
            label="Cell size"
            value={region.cell}
            min={3} max={16} step={1} unit="px"
            onChange={(v) => onChange({ cell: v })}
          />
        )}
        {region.primitive === 'redact' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#454c5a', marginBottom: 8 }}>
              Fill color
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'black',  swatch: '#0b0e16', label: 'Black' },
                { id: 'brand',  swatch: 'oklch(0.58 0.19 258)', label: 'Brand' },
              ].map(c => {
                const active = region.ink === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onChange({ ink: c.id })}
                    style={{
                      flex: 1, padding: '7px 8px', borderRadius: 8,
                      border: active ? '1.5px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.93 0.006 258)',
                      background: active ? 'oklch(0.97 0.035 258)' : '#fff',
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12, fontWeight: 500, color: '#1d2230',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: c.swatch,
                    }}/>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px dashed oklch(0.9 0.006 258)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, color: '#454c5a',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={region.persist}
              onChange={(e) => onChange({ persist: e.target.checked })}
              style={{ accentColor: 'oklch(0.58 0.19 258)' }}/>
            Apply to all steps
          </label>
          <span className="mono" style={{ fontSize: 10, color: '#8a919e' }}>
            {paramText(region)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#454c5a' }}>{label}</span>
        <span className="mono" style={{
          fontSize: 11, fontWeight: 600,
          color: '#1d2230',
          background: '#fff',
          border: '1px solid oklch(0.92 0.008 258)',
          padding: '2px 7px', borderRadius: 5,
        }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: 'oklch(0.58 0.19 258)',
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#8a919e', marginTop: 2 }} className="mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// RegionList — quick-switch between the 3 detected regions
// ------------------------------------------------------------------
function RegionList({ regions, activeId, onSelect }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
        color: '#6a7180', marginBottom: 8,
      }}>Detected regions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {regions.map(r => {
          const active = r.id === activeId;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 9px', borderRadius: 8,
                background: active ? 'oklch(0.97 0.035 258)' : '#fff',
                border: active ? '1.5px solid oklch(0.78 0.1 258)' : '1px solid oklch(0.94 0.006 258)',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <PrimitiveDot primitive={r.primitive}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d2230' }}>{r.label}</div>
                <div className="mono" style={{ fontSize: 10, color: '#8a919e' }}>{paramText(r)}</div>
              </div>
              {/* mini preview */}
              <div style={{
                width: 48, height: 18,
                borderRadius: 3, overflow: 'hidden',
                border: '1px solid oklch(0.93 0.006 258)',
              }}>
                <PrimitiveFill region={r}/>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Timeline variant — highlights which steps each region appears in
// ------------------------------------------------------------------
function RedactionTimeline({ steps, active, onSelect, regions }) {
  // Region → which step indices it lives on. Only step 2 (detail) has them by default.
  const regionSteps = new Set([1]);

  return (
    <div style={studioStyles.timeline}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6a7180', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Timeline
        </div>
        <span className="mono" style={{ fontSize: 11, color: '#8a919e' }}>
          {steps.length} steps · 42 sec · redactions baked at encode
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {steps.map((s, i) => {
          const isActive = i === active;
          const hasRegions = regionSteps.has(i);
          return (
            <button
              key={s.idx}
              onClick={() => onSelect(i)}
              style={{
                width: 128, flexShrink: 0,
                border: isActive ? '2px solid oklch(0.58 0.19 258)' : '1px solid oklch(0.92 0.008 258)',
                borderRadius: 8, padding: 6, background: '#fff',
                textAlign: 'left', position: 'relative',
                boxShadow: isActive ? '0 0 0 3px oklch(0.96 0.035 258)' : 'none',
                transition: 'all 140ms',
              }}
            >
              <div style={{
                width: '100%', height: 56, background: '#fafbfc',
                borderRadius: 4, overflow: 'hidden', position: 'relative',
              }}>
                <StepThumb kind={s.thumb}/>
                {hasRegions && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    pointerEvents: 'none',
                  }}>
                    {regions.map((r, idx) => (
                      <div key={r.id} style={{
                        position: 'absolute',
                        left: `${(r.rect.left / 820) * 100}%`,
                        top:  `${(r.rect.top / 480) * 100}%`,
                        width:  `${(r.rect.width  / 820) * 100}%`,
                        height: `${(r.rect.height / 480) * 100}%`,
                        background: tintFor(r.primitive, 0.85),
                        borderRadius: 1,
                      }}/>
                    ))}
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
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {s.label}
                </span>
                {hasRegions && (
                  <span className="mono" style={{
                    fontSize: 9, fontWeight: 700,
                    color: '#fff', background: 'oklch(0.48 0.16 80)',
                    padding: '1px 4px', borderRadius: 3,
                  }}>{regions.length}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Small visual primitives
// ------------------------------------------------------------------
function PrimitiveDot({ primitive, small, dark }) {
  const size = small ? 9 : 10;
  return (
    <div style={{
      width: size, height: size, borderRadius: 2,
      background: tintFor(primitive, 1),
      boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,.3)' : 'inset 0 0 0 1px rgba(0,0,0,.06)',
      flexShrink: 0,
    }}/>
  );
}

function PrimitivePreview({ region, width, height }) {
  return (
    <div style={{
      width, height, borderRadius: 4, overflow: 'hidden',
      border: '1px solid oklch(0.93 0.006 258)',
    }}>
      <PrimitiveFill region={region}/>
    </div>
  );
}

function BakedPreviewStrip({ regions }) {
  // A cropped band of the detail screen showing the Customer panel with redactions baked in.
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fff',
      display: 'flex',
    }}>
      {/* Left mock: transcript column */}
      <div style={{ flex: 1.3, padding: '10px 14px', borderRight: '1px solid #eef1f5' }}>
        <div style={{ height: 8, width: '40%', background: '#d4d8e0', borderRadius: 2 }}/>
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, width: '80%', background: '#eef1f5', borderRadius: 2, marginBottom: 5 }}/>
          <div style={{ height: 6, width: '70%', background: '#eef1f5', borderRadius: 2, marginBottom: 5 }}/>
          <div style={{ height: 6, width: '55%', background: '#eef1f5', borderRadius: 2 }}/>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 6, width: '75%', background: '#eef1f5', borderRadius: 2, marginBottom: 5 }}/>
          <div style={{ height: 6, width: '45%', background: '#eef1f5', borderRadius: 2 }}/>
        </div>
      </div>
      {/* Right: Customer card with baked redactions */}
      <div style={{ flex: 1, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1d2230', marginBottom: 6 }}>Customer</div>
        {[
          { label: 'Name',  region: regions.find(r => r.id === 'r-name') },
          { label: 'Email', region: regions.find(r => r.id === 'r-email') },
          { label: 'Phone', region: regions.find(r => r.id === 'r-phone') },
          { label: 'Plan',  region: null, value: 'Premier' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#8a919e', width: 36 }}>{row.label}:</span>
            {row.region ? (
              <div style={{
                height: 12, flex: 1, maxWidth: 120,
                borderRadius: 2, overflow: 'hidden',
                border: '0.5px solid oklch(0.94 0.006 258)',
              }}>
                <PrimitiveFill region={row.region}/>
              </div>
            ) : (
              <span style={{ fontSize: 9.5, color: '#1d2230' }}>{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function paramText(r) {
  if (r.primitive === 'blur')     return `blur(${r.blurPx}px)`;
  if (r.primitive === 'pixelate') return `mosaic(cell=${r.cell}px)`;
  if (r.primitive === 'redact')   return `fill(${r.ink})`;
  return '';
}

function tintFor(primitive, alpha) {
  if (primitive === 'blur')     return `oklch(0.58 0.19 258 / ${alpha})`;
  if (primitive === 'pixelate') return `oklch(0.52 0.17 300 / ${alpha})`;
  if (primitive === 'redact')   return `oklch(0.15 0.02 255 / ${alpha})`;
  return '#000';
}

function bakeStepLabel(p, regions) {
  if (p < 30)  return `scanning frame 1 · ${regions.length} regions`;
  if (p < 55)  return `applying ${PRIMITIVE_META[regions[0].primitive].label.toLowerCase()}`;
  if (p < 80)  return `applying ${PRIMITIVE_META[regions[1].primitive].label.toLowerCase()}`;
  if (p < 98)  return `packaging zip · step_04.png`;
  return `done`;
}

Object.assign(window, { FlowF });
