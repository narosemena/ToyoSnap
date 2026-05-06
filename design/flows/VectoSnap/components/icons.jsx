// Icon set — 1.5px stroke line icons, 20×20 viewBox
const Icon = ({ name, size = 18, stroke = 'currentColor', fill = 'none', style }) => {
  const s = { width: size, height: size, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style };
  const common = {
    width: size, height: size, viewBox: '0 0 20 20', fill,
    stroke, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: s,
  };
  switch (name) {
    case 'record':
      return <svg {...common}><circle cx="10" cy="10" r="4" fill={stroke === 'currentColor' ? 'currentColor' : stroke} stroke="none"/></svg>;
    case 'stop':
      return <svg {...common}><rect x="5.5" y="5.5" width="9" height="9" rx="1.5" fill={stroke === 'currentColor' ? 'currentColor' : stroke} stroke="none"/></svg>;
    case 'pause':
      return <svg {...common}><rect x="6" y="5" width="2.5" height="10" rx="0.6"/><rect x="11.5" y="5" width="2.5" height="10" rx="0.6"/></svg>;
    case 'play':
      return <svg {...common}><path d="M6 4.5 L15 10 L6 15.5 Z" fill="currentColor" stroke="none"/></svg>;
    case 'check':
      return <svg {...common}><path d="M4 10.5 L8 14.5 L16 6"/></svg>;
    case 'x':
      return <svg {...common}><path d="M5 5 L15 15 M15 5 L5 15"/></svg>;
    case 'chevron-right':
      return <svg {...common}><path d="M8 5 L13 10 L8 15"/></svg>;
    case 'chevron-left':
      return <svg {...common}><path d="M12 5 L7 10 L12 15"/></svg>;
    case 'chevron-down':
      return <svg {...common}><path d="M5 8 L10 13 L15 8"/></svg>;
    case 'download':
      return <svg {...common}><path d="M10 3 V13 M6 9 L10 13 L14 9 M4 16 H16"/></svg>;
    case 'shield':
      return <svg {...common}><path d="M10 2.5 L16 5 V10 C16 13 13.5 16 10 17.5 C6.5 16 4 13 4 10 V5 Z"/></svg>;
    case 'shield-check':
      return <svg {...common}><path d="M10 2.5 L16 5 V10 C16 13 13.5 16 10 17.5 C6.5 16 4 13 4 10 V5 Z"/><path d="M7 10 L9 12 L13 8"/></svg>;
    case 'lock':
      return <svg {...common}><rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9 V6.5 A3 3 0 0 1 13 6.5 V9"/></svg>;
    case 'cursor':
      return <svg {...common}><path d="M4.5 3.5 L4.5 15 L8 12 L10 16 L11.5 15.2 L9.5 11.2 L14 11 Z"/></svg>;
    case 'image':
      return <svg {...common}><rect x="3" y="4" width="14" height="12" rx="1.5"/><circle cx="7.5" cy="8.5" r="1.2"/><path d="M3 13 L7 10 L11 13 L17 8"/></svg>;
    case 'svg':
      return <svg {...common}><path d="M3 4 H17 V16 H3 Z"/><path d="M3 8 H17 M3 12 H17 M7 4 V16 M13 4 V16"/></svg>;
    case 'video':
      return <svg {...common}><rect x="2.5" y="5" width="11" height="10" rx="1.5"/><path d="M13.5 9 L17.5 6.5 V13.5 L13.5 11 Z"/></svg>;
    case 'html':
      return <svg {...common}><path d="M7 7 L4 10 L7 13 M13 7 L16 10 L13 13 M11 5 L9 15"/></svg>;
    case 'folder':
      return <svg {...common}><path d="M3 6 A1.5 1.5 0 0 1 4.5 4.5 H8 L10 6.5 H15.5 A1.5 1.5 0 0 1 17 8 V14.5 A1.5 1.5 0 0 1 15.5 16 H4.5 A1.5 1.5 0 0 1 3 14.5 Z"/></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 6 H16 M8 6 V4.5 A1 1 0 0 1 9 3.5 H11 A1 1 0 0 1 12 4.5 V6 M6 6 L7 16.5 A1 1 0 0 0 8 17.5 H12 A1 1 0 0 0 13 16.5 L14 6 M8.5 9 V14 M11.5 9 V14"/></svg>;
    case 'eye-off':
      return <svg {...common}><path d="M3 3 L17 17 M7.5 7.5 A3 3 0 0 0 12.5 12.5 M5 5.5 C3.5 7 2.5 9 2.5 10 C2.5 11.5 5.5 15.5 10 15.5 C11.3 15.5 12.5 15.1 13.5 14.5 M9 5 C9.3 5 9.7 4.9 10 4.9 C14.5 4.9 17.5 9 17.5 10 C17.5 10.6 17 11.5 16.2 12.5"/></svg>;
    case 'sparkle':
      return <svg {...common}><path d="M10 3 L11.5 8.5 L17 10 L11.5 11.5 L10 17 L8.5 11.5 L3 10 L8.5 8.5 Z"/></svg>;
    case 'grid':
      return <svg {...common}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>;
    case 'settings':
      return <svg {...common}><circle cx="10" cy="10" r="2.5"/><path d="M10 2.5 V4 M10 16 V17.5 M17.5 10 H16 M4 10 H2.5 M15.3 4.7 L14.2 5.8 M5.8 14.2 L4.7 15.3 M15.3 15.3 L14.2 14.2 M5.8 5.8 L4.7 4.7"/></svg>;
    case 'plus':
      return <svg {...common}><path d="M10 4 V16 M4 10 H16"/></svg>;
    case 'blur':
      return <svg {...common}><circle cx="10" cy="10" r="6" strokeDasharray="2 2"/><circle cx="10" cy="10" r="2.5"/></svg>;
    case 'puzzle':
      return <svg {...common}><path d="M4 5 H8 A1 1 0 0 0 9 4 A1.5 1.5 0 0 1 12 4 A1 1 0 0 0 13 5 H17 V9 A1 1 0 0 1 16 10 A1.5 1.5 0 0 0 16 13 A1 1 0 0 1 17 14 V17 H13 A1 1 0 0 1 12 16 A1.5 1.5 0 0 0 9 16 A1 1 0 0 1 8 17 H4 V13 A1 1 0 0 0 5 12 A1.5 1.5 0 0 1 5 9 A1 1 0 0 0 4 8 Z"/></svg>;
    case 'pin':
      return <svg {...common}><path d="M10 2.5 V6 M6 6 H14 L13 10 L10 11 L7 10 Z M10 11 V17.5"/></svg>;
    case 'clock':
      return <svg {...common}><circle cx="10" cy="10" r="7"/><path d="M10 6 V10 L12.5 12"/></svg>;
    case 'layers':
      return <svg {...common}><path d="M10 3 L17 7 L10 11 L3 7 Z"/><path d="M3 10 L10 14 L17 10"/><path d="M3 13 L10 17 L17 13"/></svg>;
    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={s}>
          <defs>
            <linearGradient id="vs-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="oklch(0.62 0.19 258)"/>
              <stop offset="1" stopColor="oklch(0.48 0.18 270)"/>
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#vs-g)"/>
          <path d="M7 8 L10 15 L12 10 L14 15 L17 8" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return <svg {...common}><circle cx="10" cy="10" r="6"/></svg>;
  }
};

Object.assign(window, { Icon });
