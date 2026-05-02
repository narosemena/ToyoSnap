/**
 * In-page recording overlay — shadow DOM floating pill shown during active capture.
 * Uses shadow DOM so host-page CSS cannot bleed in.
 */

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let startTime = 0;
let stepCount = 0;

// ── Public API ────────────────────────────────────────────────────────────

export function incrementStepCount(): void {
  stepCount += 1;
  const el = shadow?.getElementById("vs-steps");
  if (el) el.textContent = String(stepCount).padStart(2, "0");
  showToast(`Step ${stepCount} captured`);
}

export function mountOverlay(captureMode: string, onStop: () => void): void {
  if (host) return;

  startTime = Date.now();
  stepCount = 0;
  const modeLabel = captureMode === "svg" ? "SVG Layers" : "Screenshot Chain";

  host = document.createElement("div");
  host.id = "vs-overlay-host";
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const pill = document.createElement("div");
  pill.id = "vs-pill";

  const dot = document.createElement("span");
  dot.className = "vs-dot";
  pill.appendChild(dot);

  const label = document.createElement("span");
  label.className = "vs-label";
  label.textContent = modeLabel;
  pill.appendChild(label);

  const sep1 = document.createElement("span");
  sep1.className = "vs-sep";
  sep1.textContent = "·";
  pill.appendChild(sep1);

  const timer = document.createElement("span");
  timer.id = "vs-timer";
  timer.className = "vs-timer";
  timer.textContent = "00:00";
  pill.appendChild(timer);

  const sep2 = document.createElement("span");
  sep2.className = "vs-sep";
  sep2.textContent = "·";
  pill.appendChild(sep2);

  const stepsWrap = document.createElement("span");
  stepsWrap.className = "vs-steps-wrap";
  const stepsSpan = document.createElement("span");
  stepsSpan.id = "vs-steps";
  stepsSpan.textContent = "00";
  stepsWrap.appendChild(stepsSpan);
  stepsWrap.append(" steps");
  pill.appendChild(stepsWrap);

  const stopBtn = document.createElement("button");
  stopBtn.className = "vs-stop-btn";
  stopBtn.id = "vs-stop";
  stopBtn.textContent = "Stop";
  pill.appendChild(stopBtn);

  shadow.appendChild(pill);

  shadow.getElementById("vs-stop")?.addEventListener("click", () => {
    unmountOverlay();
    onStop();
  });

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const s = (elapsed % 60).toString().padStart(2, "0");
    const el = shadow?.getElementById("vs-timer");
    if (el) el.textContent = `${m}:${s}`;
  }, 500);

  // Click burst animation on every document click
  clickHandler = (e: MouseEvent) => {
    if (!shadow) return;
    const burst = document.createElement("div");
    burst.className = "vs-burst";
    burst.style.left = `${e.clientX}px`;
    burst.style.top = `${e.clientY}px`;
    shadow.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove(), { once: true });
  };
  document.addEventListener("click", clickHandler, { capture: true, passive: true });
}

export function unmountOverlay(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (clickHandler) {
    document.removeEventListener("click", clickHandler, { capture: true });
    clickHandler = null;
  }
  host?.remove();
  host = null;
  shadow = null;
  stepCount = 0;
}

// ── Internal helpers ──────────────────────────────────────────────────────

function showToast(text: string): void {
  if (!shadow) return;
  shadow.getElementById("vs-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "vs-toast";
  toast.textContent = text;
  toast.setAttribute("style", [
    "position:fixed", "bottom:20px", "right:20px",
    "background:rgba(0,0,0,0.82)", "color:#fff",
    "font:500 12px/1 Inter,system-ui,sans-serif",
    "padding:7px 13px", "border-radius:8px",
    "z-index:2147483647", "opacity:1",
    "transition:opacity 0.3s ease", "pointer-events:none",
  ].join(";"));
  shadow.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

const STYLES = `
#vs-pill {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; display: flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  background: rgba(10,10,15,0.88); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 100px;
  font: 500 12px/1 Inter, system-ui, sans-serif; color: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: auto; user-select: none;
}
.vs-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: oklch(0.58 0.19 25);
  animation: vs-pulse 1.2s ease-in-out infinite;
}
@keyframes vs-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.vs-label { opacity: 0.7; }
.vs-timer { font-variant-numeric: tabular-nums; }
.vs-sep { opacity: 0.3; }
.vs-steps-wrap { opacity: 0.85; }
.vs-stop-btn {
  margin-left: 4px; padding: 3px 10px; border-radius: 100px;
  background: oklch(0.58 0.19 25); border: none; color: #fff;
  font: 600 11px/1 Inter, system-ui, sans-serif; cursor: pointer;
  transition: opacity 0.15s;
}
.vs-stop-btn:hover { opacity: 0.85; }
.vs-burst {
  position: fixed; width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid oklch(0.62 0.19 258); pointer-events: none;
  transform: translate(-50%,-50%) scale(0);
  animation: vs-burst 0.45s ease-out forwards; z-index: 2147483646;
}
@keyframes vs-burst {
  0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.9; }
  100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
}
`;
