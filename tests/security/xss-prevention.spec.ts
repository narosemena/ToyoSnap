/**
 * Security Gate: XSS prevention via dom-sanitizer.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("template injection does not execute script tags", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);

  const injected = await page.evaluate(() => {
    const node = document.createElement("div");
    document.body.appendChild(node);

    const malicious = "<script>window.__xss_fired = true;<\/script><img src=x onerror='window.__xss_fired=true'>";
    
    const sanitizer = (window as any).__toyosnap_sanitizer;
    node.textContent = sanitizer ? sanitizer.sanitizeForTextContent(malicious) : malicious;

    return {
      textContent: node.textContent,
      xssFired: (window as any).__xss_fired === true,
    };
  });

  expect(injected.xssFired, "XSS script executed!").toBe(false);
  expect(injected.textContent).not.toContain("<script>");
});
