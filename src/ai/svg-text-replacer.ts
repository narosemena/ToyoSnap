import type { SvgReplacement } from '@/types/ai';

export function applyReplacements(svgText: string, replacements: SvgReplacement[]): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  for (const r of replacements) {
    if (!r.approved) continue;
    const el = doc.querySelector(r.selector);
    if (el) el.textContent = r.syntheticReplacement;
  }

  return new XMLSerializer().serializeToString(doc);
}
