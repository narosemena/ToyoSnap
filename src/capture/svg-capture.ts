/**
 * SVG DOM capture mode.
 * Converts the live DOM to SVG using dom-to-svg, then extracts 4 named layers.
 */
import { documentToSVG, elementToSVG } from "dom-to-svg";
import type { BaseCapture } from "./base-capture";
import { putStep, putBlob, countStepsBySession } from "@/storage/ephemeral-db";

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
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    const svgDocument = documentToSVG(document);
    const svgElement = svgDocument.documentElement;

    // Extract 4 named layers
    await this.addLayers(svgElement);

    const serialized = new XMLSerializer().serializeToString(svgDocument);
    const buffer = new TextEncoder().encode(serialized).buffer;

    const blobId = crypto.randomUUID();
    await putBlob(blobId, buffer);

    const stepIndex = (await countStepsBySession(this.sessionId)) + 1;
    await putStep({
      sessionId: this.sessionId,
      stepIndex,
      timestamp: Date.now(),
      url: location.href,
      pageTitle: document.title,
      blobId,
      rrwebEvents: null,
      actionStep: null,
      spotlightSelector: null,
    });
  }

  private async addLayers(svgEl: SVGElement): Promise<void> {
    const layers = ["background", "content", "interactive", "annotations"];
    for (const layerName of layers) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", `toyosnap-layer-${layerName}`);
      g.setAttribute("data-layer", layerName);
      svgEl.appendChild(g);
    }
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.onUserClick(new MouseEvent("click"));
  }
}
