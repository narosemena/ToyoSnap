import DOMPurify from "dompurify";

/**
 * Sanitizes a string value before injecting it into the DOM.
 * Strips all HTML tags — output is safe for textContent or input.value assignment.
 * Never use innerHTML with values from this module.
 */
export function sanitizeForTextContent(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
}

/**
 * Injects a sanitized value into a DOM node located by data-rrweb-id.
 * Rules enforced:
 *   1. Value is stripped of all HTML via DOMPurify
 *   2. Always uses textContent or input.value — never innerHTML
 *   3. Skips <script> and <iframe> nodes with a console.warn
 */
export function injectSanitizedValue(node: Element, rawValue: string): void {
  const tag = node.tagName.toLowerCase();

  if (tag === "script" || tag === "iframe") {
    console.warn(
      `[ToyoSnap] dom-sanitizer: refusing to inject into <${tag}> element. Selector: ${node.getAttribute("data-rrweb-id") ?? "(unknown)"}`
    );
    return;
  }

  const sanitized = sanitizeForTextContent(rawValue);

  if (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  ) {
    node.value = sanitized;
  } else {
    node.textContent = sanitized;
  }
}
