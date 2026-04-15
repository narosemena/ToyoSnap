import type { SyntheticTemplate, TemplateField } from "@/types/template";

/**
 * Walks the DOM to find all fillable fields (inputs, selects, textareas, editable cells).
 * Strips actual field values â€” only metadata is captured.
 * Fields are keyed by data-rrweb-id (stable) when present.
 */
export function parseTemplate(sessionId: string): SyntheticTemplate {
  const fields: TemplateField[] = [];
  const fillable = document.querySelectorAll(
    "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=password]), select, textarea, td[contenteditable], [role=textbox], [role=combobox]"
  );

  for (const el of Array.from(fillable)) {
    const rrwebId = el.getAttribute("data-rrweb-id") ?? crypto.randomUUID();
    const tag = el.tagName.toLowerCase();

    // Resolve the nearest label or table header text for a contextual hint
    const id = el.getAttribute("id");
    let headerLabel: string | null = null;
    if (id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (labelEl) headerLabel = (labelEl as HTMLElement).innerText.trim();
    }
    if (!headerLabel) {
      const th = el.closest("tr")?.previousElementSibling?.querySelector("th");
      if (th) headerLabel = (th as HTMLElement).innerText.trim();
    }

    fields.push({
      rrwebId,
      elementTag: tag,
      headerLabel: headerLabel ?? null,
      placeholder: el.getAttribute("placeholder") ?? "",
    });
  }

  return { sessionId, generatedAt: Date.now(), fields };
}
