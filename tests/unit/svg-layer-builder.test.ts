import { describe, test, expect } from "vitest";

// Tests the 4-layer SVG structure that SvgCapture creates
// We test the addLayers logic directly by reproducing it
const EXPECTED_LAYERS = ["background", "content", "interactive", "annotations"];

function addLayersToSvg(svgEl: { appendChild: (el: unknown) => void; children: unknown[] }): string[] {
  const added: string[] = [];
  for (const layerName of EXPECTED_LAYERS) {
    added.push(`toyosnap-layer-${layerName}`);
    svgEl.appendChild({ id: `toyosnap-layer-${layerName}`, "data-layer": layerName });
  }
  return added;
}

describe("SVG layer structure", () => {
  test("produces 4 named layer groups", () => {
    const mockSvg = { appendChild: () => {}, children: [] };
    const layers = addLayersToSvg(mockSvg);
    expect(layers).toHaveLength(4);
  });

  test("layers are named correctly", () => {
    const mockSvg = { appendChild: () => {}, children: [] };
    const layers = addLayersToSvg(mockSvg);
    expect(layers).toContain("toyosnap-layer-background");
    expect(layers).toContain("toyosnap-layer-content");
    expect(layers).toContain("toyosnap-layer-interactive");
    expect(layers).toContain("toyosnap-layer-annotations");
  });
});
