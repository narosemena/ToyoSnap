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
    
    // Capture initial DOM state. Delay to ensure page has rendered (especially on navigation).
    // Minimum 1000ms as requested to avoid blank screens.
    const delay = document.readyState === "complete" ? 1000 : 2000;
    setTimeout(() => void this.captureCurrentState(), delay);
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  async captureStep(_stepIndex: number): Promise<void> {
    // Already handled by click listener and start()
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    // 1 click equals 2 captures:
    // 1. Capture the current screen IMMEDIATELY (before the click processes)
    void this.captureCurrentState();

    // 2. Capture the next screen after a delay (allowing DOM/navigation to process)
    // Set to 2000ms as requested to ensure stable UI rendering.
    setTimeout(() => void this.captureCurrentState(), 2000);
  }

  private async captureCurrentState(): Promise<void> {
    try {
      // Correct behavior: capture should snap only visible elements in the browser window.
      const width = window.innerWidth;
      const height = window.innerHeight;

      // --- DOM Pruning: Mark off-screen elements for removal ---
      // We iterate the live DOM and mark elements that are completely outside the viewport.
      // This allows us to physically remove them from the SVG after capture.
      const allElements = document.querySelectorAll("body *");
      const markedElements: Element[] = [];
      
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        // Skip elements that might be important or are the overlay itself
        if (el.id === "toyosnap-overlay-host") continue;
        
        const rect = el.getBoundingClientRect();
        // Check if element is completely off-screen
        const isOffScreen = 
          rect.bottom < 0 || 
          rect.top > height || 
          rect.right < 0 || 
          rect.left > width;

        if (isOffScreen && rect.width > 0 && rect.height > 0) {
          el.setAttribute("data-ts-prune", "true");
          markedElements.push(el);
        }
      }

      // Wrap documentToSVG in a robust try/catch to bypass CSS parsing errors.
      // The dom-to-svg library crashes on modern CSS features like oklab gradients.
      // We attempt to capture; if it fails, we assume a CSS parse error,
      // temporarily disable all stylesheets, capture a degraded version, and restore them.
      let svgDocument: Document;
      let disabledSheets: CSSStyleSheet[] = [];

      try {
        svgDocument = documentToSVG(document, { width, height });
      } catch (parseError) {
        console.warn("[ToyoSnap SVG] First pass failed, likely due to modern CSS syntax. Disabling stylesheets and retrying.", parseError);
        
        // Find and disable all stylesheets to bypass the CSS parser crash
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          if (!sheet.disabled) {
            sheet.disabled = true;
            disabledSheets.push(sheet);
          }
        }
        
        // Retry capture without stylesheets (structural only)
        try {
          svgDocument = documentToSVG(document, { width, height });
        } finally {
          // ALWAYS restore stylesheets immediately after retry, even if it fails again
          disabledSheets.forEach(sheet => { sheet.disabled = false; });
        }
      }

      // --- Cleanup: Remove marked elements from SVG and Live DOM ---
      const svgPruneTargets = svgDocument.querySelectorAll('[data-ts-prune="true"]');
      svgPruneTargets.forEach(el => el.remove());
      
      // Remove marks from live DOM immediately
      markedElements.forEach(el => el.removeAttribute("data-ts-prune"));

      const svgElement = svgDocument.documentElement as unknown as SVGElement;

      // Ensure the SVG reflects the window size and has a proper viewBox
      svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");

      this.addLayers(svgElement);

      // --- Post-processing for Adobe Illustrator & Offline Export ---
      // Illustrator requires images to be either embedded (base64) or valid local links.
      // Relative paths like "icon.svg" will break. We attempt to inline them via fetch.
      const images = Array.from(svgDocument.querySelectorAll("image"));
      await Promise.all(
        images.map(async (img) => {
          const href = img.getAttribute("href") || img.getAttribute("xlink:href");
          if (href && !href.startsWith("data:")) {
            try {
              const absoluteUrl = new URL(href, location.href).href;
              // Attempt to fetch and inline (timeout after 1000ms)
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1000);
              
              try {
                const res = await fetch(absoluteUrl, { mode: "cors", signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                  const blob = await res.blob();
                  const reader = new FileReader();
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                  if (img.hasAttribute("href")) img.setAttribute("href", dataUrl);
                  if (img.hasAttribute("xlink:href")) img.setAttribute("xlink:href", dataUrl);
                  return; // Success
                }
              } catch (fetchErr) {
                clearTimeout(timeoutId);
              }

              // Fallback to absolute HTTP URL if fetch fails (CORS or timeout)
              if (img.hasAttribute("href")) img.setAttribute("href", absoluteUrl);
              if (img.hasAttribute("xlink:href")) img.setAttribute("xlink:href", absoluteUrl);
            } catch (urlErr) {
              // Ignore invalid URLs
            }
          }
        })
      );

      const serialized = new XMLSerializer().serializeToString(svgDocument);
      const bytes = new TextEncoder().encode(serialized);
      const base64 = toBase64Chunked(bytes);

      if (!chrome.runtime?.id) {
        console.warn("[ToyoSnap SVG] Extension context invalidated, stopping capture.");
        return;
      }

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
      console.error("[ToyoSnap SVG] capture completely failed after fallback:", err);
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
