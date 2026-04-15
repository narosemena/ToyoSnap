import { describe, test, expect, vi } from "vitest";

// Mock DOMPurify for the unit test environment (no DOM available in Vitest)
vi.mock("dompurify", () => ({
  default: {
    sanitize: (input: string, options: { ALLOWED_TAGS: string[] }) => {
      if (options.ALLOWED_TAGS.length === 0) {
        // Strip all HTML tags
        return input.replace(/<[^>]*>/g, "");
      }
      return input;
    },
  },
}));

import { sanitizeForTextContent } from "../../src/security/dom-sanitizer";

describe("sanitizeForTextContent", () => {
  test("strips script tags", () => {
    const result = sanitizeForTextContent("<script>alert(1)</script>hello");
    expect(result).not.toContain("<script>");
    expect(result).toContain("hello");
  });

  test("strips all HTML tags", () => {
    const result = sanitizeForTextContent("<b>bold</b> <i>italic</i>");
    expect(result).toBe("bold italic");
  });

  test("preserves plain text", () => {
    expect(sanitizeForTextContent("Hello, World!")).toBe("Hello, World!");
  });

  test("handles empty string", () => {
    expect(sanitizeForTextContent("")).toBe("");
  });

  test("strips img onerror XSS vector", () => {
    const result = sanitizeForTextContent('<img src=x onerror="alert(1)">');
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
  });
});
