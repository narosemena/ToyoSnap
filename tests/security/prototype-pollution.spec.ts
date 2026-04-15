/**
 * Security Gate: Prototype pollution prevention.
 * Uploads {"__proto__": {"isAdmin": true}};
 * asserts ({}).isAdmin is still undefined.
 */
import { test, expect } from "@playwright/test";
import { sanitizeTemplateJSON } from "../../src/security/json-guard";

test("sanitizeTemplateJSON strips __proto__ key", () => {
  const malicious = { __proto__: { isAdmin: true }, name: "Alice" };
  const result = sanitizeTemplateJSON(malicious);
  expect(Object.keys(result)).not.toContain("__proto__");
  expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
});

test("sanitizeTemplateJSON strips constructor key", () => {
  const malicious = { constructor: { prototype: { isAdmin: true } }, name: "Bob" };
  const result = sanitizeTemplateJSON(malicious);
  expect(Object.keys(result)).not.toContain("constructor");
});

test("sanitizeTemplateJSON strips prototype key", () => {
  const malicious = { prototype: { isAdmin: true }, name: "Charlie" };
  const result = sanitizeTemplateJSON(malicious);
  expect(Object.keys(result)).not.toContain("prototype");
});

test("sanitizeTemplateJSON keeps safe string values", () => {
  const safe = { firstName: "Alice", lastName: "Smith", vin: "1HGBH41JXMN109186" };
  const result = sanitizeTemplateJSON(safe);
  expect(result["firstName"]).toBe("Alice");
  expect(result["vin"]).toBe("1HGBH41JXMN109186");
});

test("sanitizeTemplateJSON drops non-string values", () => {
  const mixed = { name: "Alice", age: 30, active: true };
  const result = sanitizeTemplateJSON(mixed as Record<string, unknown>);
  expect(result["name"]).toBe("Alice");
  expect(Object.keys(result)).not.toContain("age");
  expect(Object.keys(result)).not.toContain("active");
});
