/**
 * Spotlight effect: dims the page body and highlights the clicked element.
 * Applied briefly after each user click during capture.
 */

const OVERLAY_ID = "toyosnap-spotlight-overlay";
const HIGHLIGHT_CLASS = "toyosnap-spotlight-highlight";
const SPOTLIGHT_DURATION_MS = 800;

let overlayEl: HTMLDivElement | null = null;
let highlightedEl: Element | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function ensureStyles(): void {
  if (document.getElementById("toyosnap-spotlight-styles")) return;

  const style = document.createElement("style");
  style.id = "toyosnap-spotlight-styles";
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483646;
      transition: opacity 200ms ease;
    }
    .${HIGHLIGHT_CLASS} {
      position: relative;
      z-index: 2147483647;
      outline: 3px solid #EF4444 !important;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

export function applySpotlight(target: Element): void {
  ensureStyles();

  // Clear any running spotlight
  clearSpotlight();

  overlayEl = document.createElement("div");
  overlayEl.id = OVERLAY_ID;
  document.body.appendChild(overlayEl);

  target.classList.add(HIGHLIGHT_CLASS);
  highlightedEl = target;

  timer = setTimeout(() => {
    clearSpotlight();
  }, SPOTLIGHT_DURATION_MS);
}

function clearSpotlight(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  overlayEl?.remove();
  overlayEl = null;
  highlightedEl?.classList.remove(HIGHLIGHT_CLASS);
  highlightedEl = null;
}
