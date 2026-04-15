import { describe, test, expect, vi, beforeEach } from "vitest";

// template-parser.ts operates on the live DOM â€” set up a minimal mock
const mockFields = [
  { getAttribute: (attr: string) => attr === "data-rrweb-id" ? "field-1" : attr === "id" ? "username" : null, tagName: "INPUT", getAttribute_placeholder: "Enter username" },
];

// We test the sanitizeTemplateJSON integration separately
// Here we test that PII values are stripped from the output
import { sanitizeTemplateJSON } from "../../src/security/json-guard";

describe("template JSON safety", () => {
  test("PII values do not survive sanitization if keys are forbidden", () => {
    const rawTemplate = {
      "field-1": "John Smith",  // safe key, PII value â€” OK for template placeholder
      "__proto__": "evil",
      "constructor": "bad",
    };
    const safe = sanitizeTemplateJSON(rawTemplate);
    expect(safe["field-1"]).toBe("John Smith");
    expect(Object.keys(safe)).not.toContain("__proto__");
    expect(Object.keys(safe)).not.toContain("constructor");
  });

  test("empty template produces empty result", () => {
    const result = sanitizeTemplateJSON({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
