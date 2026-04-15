/**
 * Re-injects filled template values into DOM fields located by data-rrweb-id.
 * SECURITY: always uses dom-sanitizer â€” never innerHTML.
 */
import { injectSanitizedValue } from "@/security/dom-sanitizer";
import type { SyntheticTemplate } from "@/types/template";

export function injectTemplate(
  template: SyntheticTemplate,
  values: Record<string, string>
): { injected: number; skipped: number } {
  let injected = 0;
  let skipped = 0;

  for (const field of template.fields) {
    const value = values[field.rrwebId];
    if (value === undefined) {
      skipped++;
      continue;
    }

    const node = document.querySelector(`[data-rrweb-id="${CSS.escape(field.rrwebId)}"]`);
    if (!node) {
      skipped++;
      continue;
    }

    injectSanitizedValue(node, value);
    injected++;
  }

  return { injected, skipped };
}
