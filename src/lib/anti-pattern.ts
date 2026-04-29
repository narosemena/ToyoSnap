import type { AntiPatternEntry } from "@/types/design-system";
import { meetsWCAGAA } from "./contrast";
import { rgbToHex } from "./color-utils";

function buildSelector(el: Element): string {
  return el.id ? `#${CSS.escape(el.id)}` : el.tagName.toLowerCase();
}

export function detectAntiPatterns(
  elements: Element[],
  stepIndex: number
): AntiPatternEntry[] {
  const entries: AntiPatternEntry[] = [];

  for (const el of elements) {
    const styles = getComputedStyle(el);
    const selector = buildSelector(el);

    // Contrast failures
    const fgHex = rgbToHex(styles.color);
    const bgHex = rgbToHex(styles.backgroundColor);
    if (fgHex && bgHex && bgHex !== "#00000000") {
      if (!meetsWCAGAA(fgHex, bgHex)) {
        entries.push({
          type: "contrast-failure",
          selector,
          detail: `Foreground ${fgHex} on background ${bgHex} fails WCAG AA (4.5:1)`,
          stepIndex,
        });
      }
    }

    // Missing alt on images
    if (el.tagName.toLowerCase() === "img") {
      const alt = el.getAttribute("alt");
      if (alt === null) {
        entries.push({
          type: "missing-alt",
          selector,
          detail: "Image is missing alt attribute",
          stepIndex,
        });
      }
    }

    // Missing label on form inputs
    if (["input", "select", "textarea"].includes(el.tagName.toLowerCase())) {
      const id = el.getAttribute("id");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaLabelledBy = el.getAttribute("aria-labelledby");
      const hasLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (!ariaLabel && !ariaLabelledBy && !hasLabel) {
        entries.push({
          type: "missing-label",
          selector,
          detail: "Form control has no accessible label",
          stepIndex,
        });
      }
    }
  }

  return entries;
}
