import { describe, test, expect } from "vitest";
import { sanitizeTemplateJSON } from "../../src/security/json-guard";

describe("sanitizeTemplateJSON", () => {
  test("returns safe values for a flat string object", () => {
    const result = sanitizeTemplateJSON({ name: "Alice", vin: "12345" });
    expect(result["name"]).toBe("Alice");
    expect(result["vin"]).toBe("12345");
  });

  test("strips __proto__ key", () => {
    const result = sanitizeTemplateJSON({ __proto__: { evil: true }, name: "Alice" });
    expect(Object.keys(result)).not.toContain("__proto__");
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
  });

  test("strips constructor key", () => {
    const result = sanitizeTemplateJSON({ constructor: "bad", name: "Bob" });
    expect(Object.keys(result)).not.toContain("constructor");
  });

  test("strips prototype key", () => {
    const result = sanitizeTemplateJSON({ prototype: "bad", name: "Charlie" });
    expect(Object.keys(result)).not.toContain("prototype");
  });

  test("drops non-string values silently", () => {
    const result = sanitizeTemplateJSON({ name: "Alice", age: 30, active: true } as Record<string, unknown>);
    expect(result["name"]).toBe("Alice");
    expect(Object.keys(result)).not.toContain("age");
    expect(Object.keys(result)).not.toContain("active");
  });

  test("throws on non-object input", () => {
    expect(() => sanitizeTemplateJSON("string")).toThrow();
    expect(() => sanitizeTemplateJSON(null)).toThrow();
    expect(() => sanitizeTemplateJSON([1, 2, 3])).toThrow();
  });
});
