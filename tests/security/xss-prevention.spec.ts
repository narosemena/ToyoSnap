/**
 * Security Gate: XSS prevention via dom-sanitizer.
 * Injects <script>alert(1)</script> as a template value;
 * asserts it is sanitized (never executed).
 */
import { test, expect } from "../fixtures/extension-fixture";

test("template injection does not execute script tags", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);

  // Track any alert() or console.warn calls that would indicate script execution
  const alerts: string[] = [];
  page.on("dialog", async (dialog) => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  // Simulate injecting a malicious value into a DOM node
  const injected = await page.evaluate(() => {
    const node = document.createElement("div");
    node.setAttribute("data-rrweb-id", "test-node");
    document.body.appendChild(node);

    // Import the sanitizer and inject a malicious value
    // We test this by directly calling textContent assignment with a sanitized value
    const malicious = "<script>window.__xss_fired = true;<\/script>";
    // DOMPurify strips all tags when ALLOWED_TAGS: []
    const { sanitizeForTextContent } = (window as unknown as Record<string, unknown>).__toyosnap_sanitizer as { sanitizeForTextContent: (v: string) => string } ?? { sanitizeForTextContent: (v: string) => v };
    node.textContent = sanitizeForTextContent ? sanitizeForTextContent(malicious) : malicious;
    return {
      textContent: node.textContent,
      xssFired: (window as Record<string, unknown>).__xss_fired === true,
    };
  });

  expect(injected.xssFired).toBe(false);
  expect(alerts).toHaveLength(0);
  // The text content should not contain a <script> tag
  expect(injected.textContent).not.toContain("<script>");
});
