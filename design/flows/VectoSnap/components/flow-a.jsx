// Flow A — First-time install: welcome → empty state → pin extension → first record
// One connected interactive prototype.

function FlowA({ onExit, onGoToFlowB }) {
  const [step, setStep] = React.useState(0);
  // steps:
  // 0: Welcome screen inside studio (just installed, toolbar glows)
  // 1: User clicks toolbar icon → onboarding popup appears
  // 2: Popup shows "How it works" panel
  // 3: User dismisses → idle popup ready to record
  const [pinned, setPinned] = React.useState(false);

  // Simulated tab = chrome-extension://[id]/welcome.html
  const url = step === 0
    ? 'chrome-extension://…/welcome.html'
    : 'auditworks.example/audits';
  const tabs = step === 0
    ? [
        { title: 'Welcome · VectoSnap', active: true,
          favicon: <div style={{ width: 14, height: 14, display: 'flex' }}><Icon name="logo" size={14}/></div> },
        { title: 'chrome://extensions', active: false },
      ]
    : [
        { title: 'Quality System — Audits', active: true,
          favicon: <div style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg, #2a3854, #0e1524)' }}/> },
      ];

  const popupNode = step >= 1 && (
    step === 1
      ? <OnboardingPopup onNext={() => setStep(2)} onDismiss={() => setStep(3)}/>
      : step === 2
        ? <OnboardingTour onDone={() => setStep(3)}/>
        : <PopupIdle
            mode="png"
            onMode={() => {}}
            cursor={true}
            onCursor={() => {}}
            onStart={() => onGoToFlowB && onGoToFlowB()}
            hasSessions={false}
            emphasizeRecord={true}
          />
  );

  return (
    <FlowShell title="Flow A — First-time install & setup" onExit={onExit}>
      <BrowserWindow
        tabs={tabs}
        url={url}
        extensionActive={step >= 1}
        extensionBadge={step === 0 ? '•' : null}
        onExtensionClick={() => { if (step === 0) setStep(1); setPinned(true); }}
        popupOpen={step >= 1}
        popupNode={popupNode}
      >
        {step === 0 ? <WelcomeScreen/> : <HostApp screen="queue" onOpenAudit={() => {}} />}

        {/* Coach mark pointing up-right at the toolbar icon (which sits in the browser chrome above). */}
        {step === 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 20, zIndex: 60,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
            pointerEvents: 'none',
          }}>
            {/* Arrow originates from tooltip's top-right and curves up+right toward the icon */}
            <svg width="72" height="60" viewBox="0 0 72 60" style={{ marginRight: 6, marginBottom: -4 }}>
              <path
                d="M10 52 C 22 50, 36 40, 50 22 L 62 8"
                stroke="oklch(0.58 0.19 258)" strokeWidth="2" fill="none"
                strokeLinecap="round" strokeDasharray="0"
              />
              {/* arrowhead at the icon end (top-right) */}
              <path
                d="M56 6 L62 8 L60 14"
                stroke="oklch(0.58 0.19 258)" strokeWidth="2" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <div style={{
              background: '#1d2230', color: '#fff', padding: '10px 14px',
              borderRadius: 10, fontSize: 13, fontWeight: 500,
              boxShadow: '0 14px 40px rgba(15,20,35,.25)',
              maxWidth: 240, textAlign: 'left',
              pointerEvents: 'auto', lineHeight: 1.4,
            }}>
              Click the VectoSnap icon to get started.
            </div>
          </div>
        )}
      </BrowserWindow>
      <FlowSteps
        steps={['Install', 'Open popup', 'How it works', 'Ready to record']}
        active={step}
        onClick={setStep}
      />
    </FlowShell>
  );
}

// Welcome page inside the browser tab — what loads after `chrome.runtime.onInstalled`
function WelcomeScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, oklch(0.98 0.015 258) 0%, #ffffff 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 40, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'auto',
    }}>
      <div style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: '0 auto 18px',
          background: 'linear-gradient(135deg, oklch(0.62 0.19 258), oklch(0.48 0.18 270))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 20px 40px oklch(0.58 0.19 258 / 0.35)',
        }}>
          <Icon name="logo" size={44} style={{ filter: 'brightness(0) invert(1)' }}/>
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 600, margin: '0 0 10px', letterSpacing: -0.6 }}>
          Welcome to VectoSnap
        </h1>
        <p style={{ fontSize: 15, color: '#454c5a', margin: '0 0 22px', lineHeight: 1.55 }}>
          Capture any web workflow as screenshots, vectors, or an interactive replay.
          Nothing leaves your machine — ever.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, margin: '22px 0 24px' }}>
          {[
            { icon: 'shield-check', title: 'Zero‑egress', desc: 'CSP blocks all outbound network calls.' },
            { icon: 'lock',         title: 'Encrypted at rest', desc: 'AES‑GCM session key — wiped on exit.' },
            { icon: 'layers',       title: '5 export formats', desc: 'PNG chain, SVG layers, video, HTML, docs.' },
          ].map(f => (
            <div key={f.title} style={{
              background: '#fff', border: '1px solid oklch(0.93 0.006 258)',
              borderRadius: 10, padding: 14, textAlign: 'left',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'oklch(0.96 0.035 258)',
                color: 'oklch(0.38 0.14 258)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Icon name={f.icon} size={16} stroke="oklch(0.38 0.14 258)"/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: '#6a7180', marginTop: 3, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', border: '1px dashed oklch(0.86 0.05 258)', borderRadius: 12,
          padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="pin" size={18} stroke="oklch(0.38 0.14 258)"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Pin VectoSnap to your toolbar</div>
            <div style={{ fontSize: 12, color: '#6a7180' }}>Click the icon in the upper right to start capturing.</div>
          </div>
          <div className="mono" style={{
            fontSize: 11, color: '#454c5a',
            padding: '6px 10px', borderRadius: 6, background: '#f4f5f8',
          }}>
            ↗ top right
          </div>
        </div>
      </div>
    </div>
  );
}

// First-time popup — onboarding variant
function OnboardingPopup({ onNext, onDismiss }) {
  return (
    <div style={{ width: 360, background: '#fff', borderRadius: 14,
      border: '1px solid oklch(0.9 0.008 258)',
      boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      overflow: 'hidden',
    }}>
      {/* Decorative header */}
      <div style={{
        background: 'linear-gradient(135deg, oklch(0.96 0.035 258), oklch(0.94 0.06 270))',
        padding: '20px 18px 16px', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="logo" size={22}/>
          <div style={{ fontSize: 14, fontWeight: 600 }}>VectoSnap</div>
          <span style={{ marginLeft: 'auto',
            padding: '3px 8px', borderRadius: 999,
            background: '#fff', color: 'oklch(0.38 0.14 258)',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
          }}>v 1.0</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12, letterSpacing: -0.2 }}>You're all set.</div>
        <div style={{ fontSize: 12.5, color: '#454c5a', marginTop: 4, lineHeight: 1.45 }}>
          Take a 30‑second tour, or jump straight in.
        </div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onNext}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'oklch(0.58 0.19 258)', color: '#fff',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Icon name="sparkle" size={14}/> Show me how it works
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'transparent', color: '#454c5a',
            fontSize: 13, fontWeight: 500,
            border: '1px solid oklch(0.92 0.008 258)',
          }}
        >
          Skip — I'll figure it out
        </button>
      </div>
    </div>
  );
}

// Second onboarding panel — 3-step explainer
function OnboardingTour({ onDone }) {
  const [i, setI] = React.useState(0);
  const pages = [
    { icon: 'record',   title: 'Choose a capture mode', body: 'PNG chain for step guides. SVG for editable vectors. HTML for interactive replay.' },
    { icon: 'cursor',   title: 'Record on any page',    body: 'Click the browser tab you want to capture, then Start. Every click becomes a step.' },
    { icon: 'download', title: 'Review, sanitize, export', body: 'Blur PII in Studio, then export locally as .zip, .webm, .html or Markdown.' },
  ];
  const p = pages[i];
  const last = i === pages.length - 1;
  return (
    <div style={{ width: 360, background: '#fff', borderRadius: 14,
      border: '1px solid oklch(0.9 0.008 258)',
      boxShadow: '0 24px 60px rgba(15,20,35,.14), 0 6px 16px rgba(15,20,35,.06)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 18px 16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'oklch(0.96 0.035 258)', color: 'oklch(0.38 0.14 258)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10,
        }}>
          <Icon name={p.icon} size={22} stroke="oklch(0.38 0.14 258)"/>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</div>
        <div style={{ fontSize: 13, color: '#454c5a', marginTop: 4, lineHeight: 1.5 }}>
          {p.body}
        </div>
      </div>
      <div style={{
        padding: '10px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
        borderTop: '1px solid oklch(0.94 0.005 258)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {pages.map((_, k) => (
            <div key={k} style={{
              width: k === i ? 18 : 6, height: 6, borderRadius: 3,
              background: k === i ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
              transition: 'all 180ms',
            }}/>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={onDone} style={{ padding: '6px 10px', fontSize: 12, color: '#6a7180' }}>Skip</button>
          <button
            onClick={() => last ? onDone() : setI(i + 1)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'oklch(0.58 0.19 258)', color: '#fff',
              fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {last ? 'Done' : 'Next'} <Icon name="chevron-right" size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FlowA });
