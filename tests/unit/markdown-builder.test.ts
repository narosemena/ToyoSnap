import { describe, test, expect } from "vitest";
import { buildMarkdown } from "../../src/lib/markdown-builder";
import type { DesignSystem } from "../../src/types/design-system";

const FIXTURE: DesignSystem = {
  sessionId: "session-test",
  capturedAt: 1000000,
  colors: [
    { hex: "#1a73e8", usage: "button color", contrastOnWhite: 3.5, contrastOnBlack: 6.0 },
  ],
  typography: [
    { family: "system-ui", size: "16px", weight: "400", lineHeight: "1.5", usage: "body" },
  ],
  shadows: [{ value: "0 1px 3px rgba(0,0,0,0.12)", usage: "box-shadow" }],
  radii: [{ value: "4px", usage: "border-radius" }],
  antiPatterns: [
    {
      type: "contrast-failure",
      selector: ".btn",
      detail: "Fails WCAG AA",
      stepIndex: 1,
    },
  ],
  pageBreadcrumbs: [
    { stepIndex: 1, url: "https://example.com/page", pageTitle: "Example Page", urlSlug: "example-page" },
  ],
};

describe("buildMarkdown", () => {
  test("produces a MASTER.md string with session ID", () => {
    const { master } = buildMarkdown(FIXTURE);
    expect(master).toContain("session-test");
    expect(master).toContain("ToyoSnap Design System");
  });

  test("includes color token table", () => {
    const { master } = buildMarkdown(FIXTURE);
    expect(master).toContain("#1a73e8");
    expect(master).toContain("3.50:1");
  });

  test("includes anti-pattern table", () => {
    const { master } = buildMarkdown(FIXTURE);
    expect(master).toContain("contrast-failure");
    expect(master).toContain(".btn");
  });

  test("produces per-page markdown files", () => {
    const { pages } = buildMarkdown(FIXTURE);
    expect(pages.has("example-page")).toBe(true);
    const pageContent = pages.get("example-page")!;
    expect(pageContent).toContain("Example Page");
    expect(pageContent).toContain("https://example.com/page");
  });

  test("links to pages from master", () => {
    const { master } = buildMarkdown(FIXTURE);
    expect(master).toContain("pages/example-page.md");
  });
});
