/**
 * Extracts design tokens from the live DOM via getComputedStyle.
 * Called at the end of each capture session to populate DesignSystem.
 */
import type { ColorToken, TypographyToken, ShadowToken, RadiusToken } from "@/types/design-system";
import { contrastRatio } from "./contrast";
import { rgbToHex } from "./color-utils";

export function extractDesignTokens(elements: Element[]): {
  colors: ColorToken[];
  typography: TypographyToken[];
  shadows: ShadowToken[];
  radii: RadiusToken[];
} {
  const colorMap = new Map<string, ColorToken>();
  const typographyMap = new Map<string, TypographyToken>();
  const shadowSet = new Set<string>();
  const radiusSet = new Set<string>();

  for (const el of elements) {
    const styles = getComputedStyle(el);
    const tagUsage = el.tagName.toLowerCase();

    // Colors
    for (const prop of ["color", "backgroundColor", "borderColor"] as const) {
      const val = styles[prop];
      if (!val || val === "transparent" || val === "rgba(0, 0, 0, 0)") continue;
      const hex = rgbToHex(val);
      if (!hex || colorMap.has(hex)) continue;
      colorMap.set(hex, {
        hex,
        usage: `${tagUsage} ${prop}`,
        contrastOnWhite: contrastRatio(hex, "#ffffff"),
        contrastOnBlack: contrastRatio(hex, "#000000"),
      });
    }

    // Typography
    const fontKey = `${styles.fontFamily}-${styles.fontSize}-${styles.fontWeight}`;
    if (!typographyMap.has(fontKey)) {
      typographyMap.set(fontKey, {
        family: styles.fontFamily,
        size: styles.fontSize,
        weight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        usage: tagUsage,
      });
    }

    // Shadows
    const shadow = styles.boxShadow;
    if (shadow && shadow !== "none") shadowSet.add(shadow);

    // Border radius
    const radius = styles.borderRadius;
    if (radius && radius !== "0px") radiusSet.add(radius);
  }

  return {
    colors: Array.from(colorMap.values()),
    typography: Array.from(typographyMap.values()),
    shadows: Array.from(shadowSet).map((value) => ({ value, usage: "box-shadow" })),
    radii: Array.from(radiusSet).map((value) => ({ value, usage: "border-radius" })),
  };
}
