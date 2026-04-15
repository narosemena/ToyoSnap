/**
 * Cursor overlay content script.
 * Renders a visible cursor dot that follows mouse movements.
 * Injected programmatically by CursorTracker when captureCursor is true.
 */

const CURSOR_ID = "toyosnap-cursor-overlay";
const CURSOR_SIZE = 20;

let dot: HTMLDivElement | null = null;

function createDot(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = CURSOR_ID;
  el.style.cssText = [
    "position: fixed",
    "top: 0",
    "left: 0",
    `width: ${CURSOR_SIZE}px`,
    `height: ${CURSOR_SIZE}px`,
    "border-radius: 50%",
    "background: rgba(239, 68, 68, 0.8)",
    "border: 2px solid white",
    "pointer-events: none",
    "z-index: 2147483647",
    "transform: translate(-50%, -50%)",
    "transition: transform 50ms linear",
  ].join(";");
  return el;
}

function onMouseMove(e: MouseEvent): void {
  if (dot) {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  }
}

export function mountCursorOverlay(): void {
  if (document.getElementById(CURSOR_ID)) return;
  dot = createDot();
  document.body.appendChild(dot);
  document.addEventListener("mousemove", onMouseMove, { passive: true });
}

export function unmountCursorOverlay(): void {
  document.removeEventListener("mousemove", onMouseMove);
  const el = document.getElementById(CURSOR_ID);
  el?.remove();
  dot = null;
}
