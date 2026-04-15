/**
 * WCAG contrast ratio calculator.
 * Used by design-extractor.ts and anti-pattern.ts.
 * Also exercised directly in tests/unit/contrast.test.ts.
 */

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Parses a hex color string (#RGB or #RRGGBB) into [r, g, b] components.
 * Returns null if the string is not a valid hex color.
 */
export function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0]! + clean[0]!, 16);
    const g = parseInt(clean[1]! + clean[1]!, 16);
    const b = parseInt(clean[2]! + clean[2]!, 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 (no contrast) and 21 (max contrast).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns true if contrast ratio meets WCAG AA for normal text (4.5:1). */
export function meetsWCAGAA(hex1: string, hex2: string): boolean {
  return contrastRatio(hex1, hex2) >= 4.5;
}

/** Returns true if contrast ratio meets WCAG AAA for normal text (7:1). */
export function meetsWCAGAAA(hex1: string, hex2: string): boolean {
  return contrastRatio(hex1, hex2) >= 7;
}
