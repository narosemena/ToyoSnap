import type { BaseCapture } from "./base-capture";
import type { SvgTextElement } from "@/types/capture";
import { hideOverlay, showOverlay } from "../content/recording-overlay";

const CAPTURABLE_SELECTORS = [
  'input:not([type="hidden"]):not([type="password"]):not([type="checkbox"]):not([type="radio"])',
  "textarea",
  "select",
  "label",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "button",
].join(", ");

function isInViewport(rect: DOMRect): boolean {
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function getElementText(el: Element): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.options[el.selectedIndex]?.text ?? "";
  }
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function extractTextElements(): SvgTextElement[] {
  const elements = document.querySelectorAll(CAPTURABLE_SELECTORS);
  const result: SvgTextElement[] = [];

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (!isInViewport(rect)) continue;

    const text = getElementText(el).slice(0, 120);
    if (!text) continue;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

    const fontFamily = style.fontFamily.split(",")[0].replace(/['"]/g, "").trim() || "sans-serif";
    const fontSize = parseFloat(style.fontSize) || 14;

    result.push({
      x: Math.round(rect.left),
      // baseline ≈ 75% from top — works for single-line inputs, labels, and headings
      y: Math.round(rect.top + rect.height * 0.75),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      text,
      fontFamily,
      fontSize,
      fontWeight: style.fontWeight,
      color: style.color,
      tag: el.tagName.toLowerCase(),
    });
  }

  return result;
}

export class SvgCapture implements BaseCapture {
  private sessionId: string;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.clickHandler = (e: MouseEvent) => void this.onUserClick(e);
    document.addEventListener("click", this.clickHandler, { capture: true, passive: true });
    
    // Capture initial DOM state after page renders.
    const delay = document.readyState === "complete" ? 1000 : 2000;
    setTimeout(() => void this.onUserClick(new MouseEvent("click")), delay);
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    if (!chrome.runtime?.id) {
      console.warn("[ToyoSnap SVG] Extension context invalidated, stopping capture.");
      return;
    }
    hideOverlay();
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await chrome.runtime.sendMessage({
        type: "CAPTURE_SVG_STEP",
        payload: {
          sessionId: this.sessionId,
          url: location.href,
          pageTitle: document.title,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          textElements: extractTextElements(),
        },
      });
    } finally {
      showOverlay();
    }
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.onUserClick(new MouseEvent("click"));
  }
}
