/**
 * Detects user clicks and produces ActionStep records.
 * Label resolution order: aria-label → title → innerText (truncated 80 chars)
 */
import type { ActionStep } from "@/types/capture";

const LABEL_MAX_LEN = 80;

function truncate(s: string): string {
  return s.length > LABEL_MAX_LEN ? s.slice(0, LABEL_MAX_LEN) + "…" : s;
}

function resolveLabel(el: Element): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return truncate(ariaLabel.trim());

  const title = el.getAttribute("title");
  if (title?.trim()) return truncate(title.trim());

  const text = (el as HTMLElement).innerText?.trim() ?? "";
  return truncate(text);
}

function buildCssSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }
    const siblings = Array.from(current.parentElement?.children ?? []).filter(
      (c) => c.tagName === current!.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

export function buildActionStep(e: MouseEvent, stepIndex: number): ActionStep {
  const target = (e.target as Element) ?? document.documentElement;
  const label = resolveLabel(target);
  const role = target.getAttribute("role") ?? target.tagName.toLowerCase();
  const rrwebId = target.getAttribute("data-rrweb-id");

  return {
    stepIndex,
    timestamp: Date.now(),
    targetSelector: buildCssSelector(target),
    targetRrwebId: rrwebId,
    label,
    role,
    coordinates: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
    generatedText: `Clicked the '${label}' ${role}`,
  };
}
