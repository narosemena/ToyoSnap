// Light-themed Chrome-like window + toolbar with extension icon slot.
// Children render inside the tab's viewport.

const chromeStyles = {
  root: {
    width: '100%', height: '100%',
    background: '#eef0f4',
    display: 'flex', flexDirection: 'column',
    borderRadius: 0, overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
  },
  tabBar: {
    height: 40, background: '#dfe3ea',
    display: 'flex', alignItems: 'flex-end', padding: '0 8px',
    gap: 2, position: 'relative',
    flexShrink: 0,
  },
  traffic: {
    display: 'flex', gap: 7, padding: '0 12px 0 6px', alignSelf: 'center',
  },
  dot: (c) => ({ width: 11, height: 11, borderRadius: '50%', background: c }),
  tab: (active) => ({
    position: 'relative', height: 32, alignSelf: 'flex-end',
    padding: '0 14px 0 12px', display: 'flex', alignItems: 'center', gap: 8,
    background: active ? '#f7f8fa' : 'transparent',
    color: active ? '#1d2026' : '#5a6270',
    borderRadius: '10px 10px 0 0',
    minWidth: 180, maxWidth: 240,
    fontSize: 12, fontWeight: 500,
  }),
  toolbar: {
    height: 44, background: '#f7f8fa',
    display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
    borderBottom: '1px solid #d9dde4',
    flexShrink: 0,
  },
  navBtn: {
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#5a6270', borderRadius: 6,
  },
  urlBar: {
    flex: 1, height: 30, background: '#e7eaf0', borderRadius: 15,
    display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
    fontSize: 12.5, color: '#3a414d',
  },
  extSlot: {
    display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8,
    borderLeft: '1px solid #d9dde4', marginLeft: 4,
  },
  extIcon: (active) => ({
    width: 30, height: 30, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'oklch(0.96 0.035 258)' : 'transparent',
    boxShadow: active ? '0 0 0 1.5px oklch(0.78 0.1 258)' : 'none',
    position: 'relative',
    transition: 'all 180ms ease-out',
  }),
  viewport: {
    flex: 1, background: '#fff', overflow: 'hidden', position: 'relative',
  },
};

function TrafficLights() {
  return (
    <div style={chromeStyles.traffic}>
      <div style={chromeStyles.dot('#ff5f57')} />
      <div style={chromeStyles.dot('#febc2e')} />
      <div style={chromeStyles.dot('#28c840')} />
    </div>
  );
}

function ChromeTab({ title, favicon, active, pinned }) {
  return (
    <div style={chromeStyles.tab(active)}>
      {favicon || (
        <div style={{ width: 14, height: 14, borderRadius: 3, background: '#c8cdd5' }} />
      )}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {!pinned && active && (
        <div style={{ width: 14, height: 14, color: '#8a919c', display: 'flex' }}>
          <Icon name="x" size={12} />
        </div>
      )}
    </div>
  );
}

// Full browser window with tab bar, toolbar, extension icon in pinned slot.
// Props:
//   url, tabs: [{title, favicon, active}]
//   extensionActive: whether the pinned VectoSnap icon is lit
//   recording: shows a pulse dot on the extension icon
//   onExtensionClick: handler when user clicks the extension icon
//   popupOpen: whether popup node is rendered
//   popupNode: JSX popup anchored to the extension icon
//   overlayNode: JSX overlay above the viewport (for recording pill etc.)
function BrowserWindow({
  tabs = [{ title: 'New Tab', active: true }],
  url = 'about:blank',
  extensionActive = false,
  extensionBadge = null,
  recording = false,
  onExtensionClick,
  popupOpen = false,
  popupNode = null,
  overlayNode = null,
  children,
}) {
  return (
    <div style={chromeStyles.root}>
      {/* Tab bar */}
      <div style={chromeStyles.tabBar}>
        <TrafficLights />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1, height: '100%' }}>
          {tabs.map((t, i) => <ChromeTab key={i} {...t} />)}
          <button style={{ ...chromeStyles.navBtn, margin: '0 4px 2px 4px' }} aria-label="New tab">
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
      {/* Toolbar */}
      <div style={chromeStyles.toolbar}>
        <button style={chromeStyles.navBtn} aria-label="Back"><Icon name="chevron-left" size={16}/></button>
        <button style={chromeStyles.navBtn} aria-label="Forward"><Icon name="chevron-right" size={16}/></button>
        <button style={chromeStyles.navBtn} aria-label="Reload">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 10a6.5 6.5 0 0 1 11.1-4.6 M15 3.5 V6 H12.5"/>
            <path d="M16.5 10a6.5 6.5 0 0 1-11.1 4.6 M5 16.5 V14 H7.5"/>
          </svg>
        </button>
        <div style={chromeStyles.urlBar}>
          <Icon name="lock" size={12} style={{ color: '#6a7180' }}/>
          <span>{url}</span>
        </div>
        <div style={chromeStyles.extSlot}>
          <button
            style={chromeStyles.extIcon(extensionActive || popupOpen)}
            onClick={onExtensionClick}
            aria-label="VectoSnap"
          >
            <Icon name="logo" size={20} />
            {recording && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 10, height: 10, borderRadius: '50%',
                background: 'oklch(0.58 0.19 25)',
                boxShadow: '0 0 0 2px #f7f8fa',
                animation: 'vs-pulse 1.2s ease-in-out infinite',
              }}/>
            )}
            {extensionBadge != null && !recording && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7,
                background: 'oklch(0.58 0.19 258)', color: 'white',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2px #f7f8fa',
              }}>{extensionBadge}</span>
            )}
          </button>
        </div>
      </div>
      {/* Viewport */}
      <div style={chromeStyles.viewport}>
        {children}
        {overlayNode}
      </div>
      {/* Popup anchored to extension icon (top-right area) */}
      {popupOpen && (
        <div style={{
          position: 'absolute', top: 88, right: 18, zIndex: 50,
          animation: 'vs-popin 180ms cubic-bezier(.2,.8,.2,1)',
        }}>
          {popupNode}
        </div>
      )}
      <style>{`
        @keyframes vs-pulse {
          0%, 100% { box-shadow: 0 0 0 2px #f7f8fa, 0 0 0 0 oklch(0.58 0.19 25 / 0.6); }
          50% { box-shadow: 0 0 0 2px #f7f8fa, 0 0 0 6px oklch(0.58 0.19 25 / 0); }
        }
        @keyframes vs-popin {
          from { opacity: 0; transform: translateY(-6px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { BrowserWindow });
