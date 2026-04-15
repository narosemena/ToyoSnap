/**
 * Security Gate: Prototype pollution prevention.
 */
import { test, expect } from "@playwright/test";
import { sanitizeTemplateJSON } from "../../src/security/json-guard";

test.describe("Security: JSON Guard Sanitization", () => {
  test("strips __proto__ and constructor keys", () => {
    const malicious = { 
      "__proto__": { "isAdmin": true }, 
      "constructor": { "prototype": { "polluted": true } },
      "name": "Norman" 
    };
    const result = sanitizeTemplateJSON(malicious);
    
    expect(Object.keys(result)).not.toContain("__proto__");
    expect(Object.keys(result)).not.toContain("constructor");
    expect(({} as any).isAdmin).toBeUndefined();
  });

  test("drops non-string values per policy", () => {
    const mixed = { name: "ToyoSnap", version: 0.1, active: true };
    const result = sanitizeTemplateJSON(mixed as any);
    
    expect(result["name"]).toBe("ToyoSnap");
    expect(Object.keys(result)).not.toContain("version");
    expect(Object.keys(result)).not.toContain("active");
  });
});
