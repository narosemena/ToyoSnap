/**
 * Prototype pollution guard for bulk JSON imports.
 * Called as the FIRST step in BulkImportDropzone before any payload
 * reaches template-injector.ts.
 */

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validates and sanitizes a raw JSON payload into a flat string record.
 * Throws if the input is not a plain object.
 * Silently drops forbidden keys and non-string values.
 */
export function sanitizeTemplateJSON(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Invalid template: expected a flat object");
  }

  // Object.create(null) avoids any inherited prototype properties
  const safe: Record<string, string> = Object.create(null) as Record<string, string>;

  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    safe[k] = v;
  }

  return safe;
}
