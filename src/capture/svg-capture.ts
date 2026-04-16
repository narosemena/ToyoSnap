/**
 * SVG DOM capture mode.
 * Converts the live DOM to SVG using dom-to-svg on each user click,
 * plus a final capture when recording stops.
 *
 * btoa NOTE: btoa(String.fromCharCode(...largeArray)) throws
 * "Maximum call stack size exceeded" for arrays larger than ~64 KB.
 * Use the chunked helper below — identical to the fix in video-capture.ts.
 */
import { documentToSVG } from "dom-to-svg";
import type { BaseCapture } from "./base-capture";

function toBase64Chunked(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
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
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
    // Capture the final DOM state when recording stops
    await this.captureCurrentState();
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.captureCurrentState();
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    // Defer by one tick so click-driven DOM changes (modals, dropdowns) settle
    setTimeout(() => void this.captureCurrentState(), 0);
  }

  private async captureCurrentState(): Promise<void> {
    try {
      const svgDocument = documentToSVG(document);
      const svgElement = svgDocument.documentElement as unknown as SVGElement;

      // Add viewBox so the SVG scales correctly when displayed in <img>/<object>.
      // dom-to-svg emits fixed width/height but no viewBox — without viewBox the
      // browser treats dimensions as absolute and CSS width:100% has no effect.
      const wAttr = svgElement.getAttribute("width");
      const hAttr = svgElement.getAttribute("height");
      if (!svgElement.getAttribute("viewBox") && wAttr && hAttr) {
        const w = parseFloat(wAttr);
        const h = parseFloat(hAttr);
        if (w > 0 && h > 0) {
          svgElement.setAttribute("viewBox", `0 0 ${w} ${h}`);
          svgElement.removeAttribute("width");
          svgElement.removeAttribute("height");
        }
      }

      this.addLayers(svgElement);

      const serialized = new XMLSerializer().serializeToString(svgDocument);
      const bytes = new TextEncoder().encode(serialized);
      const base64 = toBase64Chunked(bytes);

      await chrome.runtime.sendMessage({
        type: "STORE_BLOB_STEP",
        payload: {
          sessionId: this.sessionId,
          url: location.href,
          pageTitle: document.title,
          base64,
          mimeType: "image/svg+xml",
        },
      });
    } catch (err) {
      console.error("[ToyoSnap SVG] capture failed:", err);
    }
  }

  private addLayers(svgEl: SVGElement): void {
    for (const name of ["background", "content", "interactive", "annotations"]) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", `toyosnap-layer-${name}`);
      g.setAttribute("data-layer", name);
      svgEl.appendChild(g);
    }
  }
}
