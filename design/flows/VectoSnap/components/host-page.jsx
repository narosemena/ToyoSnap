// Host page — a realistic "Quality System" app where a QA specialist audits customer service interactions.
// This is the page being recorded. Interactive: clicks on certain targets trigger the capture flow.
//
// Brand: "AuditHub" — intentionally generic placeholder tenant.

const hostStyles = {
  root: {
    width: '100%', height: '100%', background: '#f4f5f8',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1d2230', fontSize: 14,
    overflow: 'hidden', position: 'relative',
  },
  topbar: {
    height: 52, background: '#ffffff',
    borderBottom: '1px solid #e4e7ed',
    display: 'flex', alignItems: 'center', padding: '0 20px',
    gap: 16,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 9, fontWeight: 600, fontSize: 14, color: '#1d2230' },
  brandDot: {
    width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #2a3854, #0e1524)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  },
  navtabs: { display: 'flex', gap: 2, marginLeft: 20 },
  navtab: (active) => ({
    padding: '6px 12px', borderRadius: 6,
    fontSize: 13, color: active ? '#1d2230' : '#6a7180',
    background: active ? '#eef1f6' : 'transparent',
    fontWeight: active ? 600 : 500,
  }),
  user: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 13, color: '#454c5a',
  },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#d3a46a', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
  },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: {
    width: 220, borderRight: '1px solid #e4e7ed', background: '#fff',
    padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  sideGroup: {
    fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
    color: '#8a919e', padding: '12px 10px 6px',
    fontWeight: 600,
  },
  sideItem: (active) => ({
    padding: '7px 10px', borderRadius: 6, fontSize: 13,
    color: active ? '#1d2230' : '#454c5a',
    background: active ? '#eef1f6' : 'transparent',
    fontWeight: active ? 600 : 500,
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer',
  }),
  main: { flex: 1, padding: 24, overflow: 'auto' },
  h1: { fontSize: 20, fontWeight: 600, margin: '0 0 4px' },
  sub: { fontSize: 13, color: '#6a7180', margin: '0 0 20px' },

  card: {
    background: '#fff', border: '1px solid #e4e7ed', borderRadius: 10,
    padding: 16, marginBottom: 16,
  },
  cardHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1d2230' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6a7180',
    textTransform: 'uppercase', letterSpacing: 0.6,
    padding: '10px 12px', borderBottom: '1px solid #e9ecf1',
  },
  td: (isLast) => ({
    padding: '12px', fontSize: 13, color: '#2a303e',
    borderBottom: isLast ? 'none' : '1px solid #eff1f5',
  }),

  badge: (tone) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: tone === 'green' ? '#e6f4ec' : tone === 'amber' ? '#fdf2d8' : tone === 'red' ? '#fde6e4' : '#eef1f6',
    color: tone === 'green' ? '#1e6a42' : tone === 'amber' ? '#7a5a0e' : tone === 'red' ? '#8a2a22' : '#454c5a',
  }),

  btn: (variant) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid transparent',
    background: variant === 'primary' ? '#243a62' : variant === 'ghost' ? 'transparent' : '#fff',
    color: variant === 'primary' ? '#fff' : '#1d2230',
    borderColor: variant === 'secondary' ? '#d4d8e0' : 'transparent',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    cursor: 'pointer',
  }),

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  stat: {
    background: '#fff', border: '1px solid #e4e7ed', borderRadius: 10, padding: 14,
  },
  statLabel: { fontSize: 11, color: '#6a7180', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 24, fontWeight: 600, margin: '4px 0 2px', color: '#1d2230', fontVariantNumeric: 'tabular-nums' },
  statDelta: { fontSize: 12, color: '#1e6a42', fontWeight: 500 },
};

// Fake but believable audit queue
const AUDIT_ROWS = [
  { id: 'AUD-4829', agent: 'Rivera, M.', customer: 'Case #C-22847', category: 'Billing inquiry', score: 92, status: 'Ready for review', updated: '14m ago', tone: 'amber' },
  { id: 'AUD-4828', agent: 'Okafor, D.', customer: 'Case #C-22841', category: 'Policy change', score: 88, status: 'Ready for review', updated: '32m ago', tone: 'amber' },
  { id: 'AUD-4827', agent: 'Lin, H.',    customer: 'Case #C-22839', category: 'Refund request', score: 95, status: 'Approved', updated: '1h ago', tone: 'green' },
  { id: 'AUD-4826', agent: 'Park, S.',   customer: 'Case #C-22834', category: 'Account access', score: 74, status: 'Escalated', updated: '2h ago', tone: 'red' },
  { id: 'AUD-4825', agent: 'Bianchi, L.', customer: 'Case #C-22829', category: 'Billing inquiry', score: 90, status: 'Approved', updated: '3h ago', tone: 'green' },
];

// Highlightable target: any clickable element can have data-capture-target
function CaptureTarget({ children, onFire, style, as: Tag = 'button', ...rest }) {
  return (
    <Tag
      data-capture-target="true"
      onClick={(e) => { onFire && onFire(e); rest.onClick && rest.onClick(e); }}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// --- Screen 1: Audit Queue -------------------------------------------------
function QAQueuePage({ onOpenAudit, highlightRow }) {
  return (
    <div style={hostStyles.main}>
      <h1 style={hostStyles.h1}>Quality Audits</h1>
      <p style={hostStyles.sub}>Customer Service — North America region · Week 16</p>

      <div style={hostStyles.statGrid}>
        {[
          { l: 'In queue', v: '24', d: '+6 today' },
          { l: 'Avg. quality score', v: '89.2', d: '+1.4 vs. last wk' },
          { l: 'Escalated', v: '3', d: '2 open' },
          { l: 'SLA compliance', v: '98%', d: 'On target' },
        ].map((s, i) => (
          <div key={i} style={hostStyles.stat}>
            <div style={hostStyles.statLabel}>{s.l}</div>
            <div style={hostStyles.statValue}>{s.v}</div>
            <div style={hostStyles.statDelta}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={hostStyles.card}>
        <div style={hostStyles.cardHead}>
          <div style={hostStyles.cardTitle}>Audit queue</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={hostStyles.btn('secondary')}>Filters</button>
            <button style={hostStyles.btn('primary')}>Assign next</button>
          </div>
        </div>
        <table style={hostStyles.table}>
          <thead>
            <tr>
              <th style={hostStyles.th}>Audit ID</th>
              <th style={hostStyles.th}>Agent</th>
              <th style={hostStyles.th}>Case</th>
              <th style={hostStyles.th}>Category</th>
              <th style={hostStyles.th}>Score</th>
              <th style={hostStyles.th}>Status</th>
              <th style={hostStyles.th}>Updated</th>
              <th style={hostStyles.th}></th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_ROWS.map((r, i) => {
              const isTarget = i === 0;
              const isHi = highlightRow && i === 0;
              return (
                <tr key={r.id} style={{
                  background: isHi ? 'oklch(0.97 0.04 258 / 0.5)' : 'transparent',
                  transition: 'background 180ms',
                }}>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>
                    <span className="mono" style={{ fontWeight: 500 }}>{r.id}</span>
                  </td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>{r.agent}</td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}><span className="mono" style={{ fontSize: 12 }}>{r.customer}</span></td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>{r.category}</td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}><span className="mono" style={{ fontWeight: 600 }}>{r.score}</span></td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>
                    <span style={hostStyles.badge(r.tone)}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: 0.7 }}/>
                      {r.status}
                    </span>
                  </td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>
                    <span style={{ color: '#6a7180', fontSize: 12 }}>{r.updated}</span>
                  </td>
                  <td style={hostStyles.td(i === AUDIT_ROWS.length - 1)}>
                    {isTarget ? (
                      <CaptureTarget
                        style={{
                          ...hostStyles.btn('secondary'),
                          borderColor: isHi ? 'oklch(0.58 0.19 258)' : '#d4d8e0',
                          boxShadow: isHi ? '0 0 0 3px oklch(0.88 0.06 258)' : 'none',
                          position: 'relative', zIndex: isHi ? 2 : 1,
                          transition: 'all 160ms',
                        }}
                        onClick={onOpenAudit}
                      >
                        Open <Icon name="chevron-right" size={14}/>
                      </CaptureTarget>
                    ) : (
                      <button style={hostStyles.btn('secondary')}>Open</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Screen 2: Audit detail page (step 2+) ---------------------------------
function QAAuditDetail({ highlightTarget, onApprove }) {
  return (
    <div style={hostStyles.main}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6a7180', marginBottom: 8 }}>
        <span>Audits</span>
        <Icon name="chevron-right" size={12}/>
        <span className="mono">AUD-4829</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between' }}>
        <div>
          <h1 style={hostStyles.h1}>Billing inquiry — Case #C-22847</h1>
          <p style={hostStyles.sub}>Rivera, M. · 14 min handle time · 4 interactions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={hostStyles.btn('secondary')}>Flag</button>
          <CaptureTarget
            style={{
              ...hostStyles.btn('primary'),
              boxShadow: highlightTarget === 'approve' ? '0 0 0 3px oklch(0.88 0.06 258)' : 'none',
              outline: highlightTarget === 'approve' ? '2px solid oklch(0.58 0.19 258)' : 'none',
              position: 'relative',
            }}
            onClick={onApprove}
          >
            <Icon name="check" size={14}/> Approve audit
          </CaptureTarget>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div>
          {/* Scorecard */}
          <div style={hostStyles.card}>
            <div style={hostStyles.cardHead}>
              <div style={hostStyles.cardTitle}>Quality scorecard</div>
              <div style={hostStyles.badge('amber')}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>
                Ready for review
              </div>
            </div>
            {[
              { k: 'Opening & verification', v: 18, max: 20 },
              { k: 'Issue diagnosis', v: 22, max: 25 },
              { k: 'Policy adherence', v: 28, max: 30 },
              { k: 'Closing & resolution', v: 24, max: 25 },
            ].map((row) => (
              <div key={row.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #eff1f5' }}>
                <div style={{ flex: 1, fontSize: 13 }}>{row.k}</div>
                <div style={{ flex: 1.2, height: 6, background: '#eef1f5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(row.v / row.max) * 100}%`, height: '100%', background: 'oklch(0.58 0.19 258)' }}/>
                </div>
                <div className="mono" style={{ width: 56, textAlign: 'right', fontSize: 12, color: '#454c5a' }}>{row.v} / {row.max}</div>
              </div>
            ))}
          </div>

          {/* Transcript preview */}
          <div style={hostStyles.card}>
            <div style={hostStyles.cardHead}>
              <div style={hostStyles.cardTitle}>Interaction transcript</div>
              <span style={{ fontSize: 12, color: '#6a7180' }}>4 messages</span>
            </div>
            {[
              { who: 'Customer', name: 'Jordan Whitfield', text: 'Hi, I was charged twice for my March invoice and I need this resolved today.', pii: true },
              { who: 'Agent',    name: 'Rivera, M.',       text: 'I\'m sorry about that, Jordan. Let me pull up your account — can you confirm the last four of the card?', pii: false },
              { who: 'Customer', name: 'Jordan Whitfield', text: 'Sure, it ends in 4471. Account email is jwhitfield@contoso-example.com.', pii: true },
              { who: 'Agent',    name: 'Rivera, M.',       text: 'I see the duplicate. I\'ve reversed the second charge; you\'ll see it in 2–3 business days.', pii: false },
            ].map((m, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid #eff1f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: m.who === 'Customer' ? '#8a2a22' : '#1e6a42', textTransform: 'uppercase', letterSpacing: 0.6 }}>{m.who}</span>
                  <span style={{ fontSize: 12, color: '#454c5a' }}>{m.name}</span>
                </div>
                <div style={{ fontSize: 13, color: '#2a303e', lineHeight: 1.5 }}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={hostStyles.card}>
            <div style={hostStyles.cardTitle}>Agent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <div style={{ ...hostStyles.avatar, background: '#5c6ea8' }}>MR</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Rivera, M.</div>
                <div style={{ fontSize: 12, color: '#6a7180' }}>T2 Specialist · Tenure 1y 4mo</div>
              </div>
            </div>
          </div>
          <div style={hostStyles.card}>
            <div style={hostStyles.cardTitle}>Customer</div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
              <div><span style={{ color: '#6a7180' }}>Name:</span> Jordan Whitfield</div>
              <div><span style={{ color: '#6a7180' }}>Email:</span> jwhitfield@contoso-example.com</div>
              <div><span style={{ color: '#6a7180' }}>Phone:</span> (415) 555‑0198</div>
              <div><span style={{ color: '#6a7180' }}>Plan:</span> Premier</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chrome / layout shell wrapping either screen
function HostApp({ screen = 'queue', onOpenAudit, onApprove, highlight }) {
  return (
    <div style={hostStyles.root}>
      <div style={hostStyles.topbar}>
        <div style={hostStyles.brand}>
          <div style={hostStyles.brandDot}>AH</div>
          AuditHub
        </div>
        <div style={hostStyles.navtabs}>
          <div style={hostStyles.navtab(false)}>Dashboard</div>
          <div style={hostStyles.navtab(true)}>Audits</div>
          <div style={hostStyles.navtab(false)}>Calibration</div>
          <div style={hostStyles.navtab(false)}>Reports</div>
        </div>
        <div style={hostStyles.user}>
          <span>Ana Rosemena · QA Lead</span>
          <div style={hostStyles.avatar}>AR</div>
        </div>
      </div>
      <div style={hostStyles.body}>
        <div style={hostStyles.sidebar}>
          <div style={hostStyles.sideGroup}>Queues</div>
          <div style={hostStyles.sideItem(true)}>
            <Icon name="check" size={14} stroke="oklch(0.58 0.19 258)"/> My audits · 24
          </div>
          <div style={hostStyles.sideItem(false)}>
            <Icon name="clock" size={14}/> Pending review · 12
          </div>
          <div style={hostStyles.sideItem(false)}>
            <Icon name="shield" size={14}/> Escalated · 3
          </div>
          <div style={hostStyles.sideGroup}>Teams</div>
          <div style={hostStyles.sideItem(false)}>North America</div>
          <div style={hostStyles.sideItem(false)}>EMEA</div>
          <div style={hostStyles.sideItem(false)}>APAC</div>
          <div style={hostStyles.sideGroup}>Library</div>
          <div style={hostStyles.sideItem(false)}><Icon name="folder" size={14}/> Playbooks</div>
          <div style={hostStyles.sideItem(false)}><Icon name="layers" size={14}/> Rubrics</div>
        </div>
        {screen === 'queue'
          ? <QAQueuePage onOpenAudit={onOpenAudit} highlightRow={highlight === 'open-btn'}/>
          : <QAAuditDetail highlightTarget={highlight} onApprove={onApprove}/>
        }
      </div>
    </div>
  );
}

Object.assign(window, { HostApp });
