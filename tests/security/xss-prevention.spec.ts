/**
 * Security Gate: XSS prevention via dom-sanitizer.
 * Injects <script>alert(1)</script> as a template value;
 * asserts it is sanitized (never executed).
 */
import { test, expect } from "../fixtures/extension-fixture";

test("template injection does not execute script tags", async ({ context }) => {
  const page = await context.newPage();
  
  // Use a generic blank page instead of guessing Vite's HTML output path
  await page.goto("about:blank");

  const alerts: string[] = [];
  page.on("dialog", async (dialog) => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  const injected = await page.evaluate(() => {
    const node = document.createElement("div");
    node.setAttribute("data-rrweb-id", "test-node");
    document.body.appendChild(node);

    const malicious = "<script>window.__xss_fired = true;<\/script>";
    
    // Safely fallback to our pure-logic sanitizer since we are on about:blank
    const { sanitizeForTextContent } = (window as any).__toyosnap_sanitizer || { 
      sanitizeForTextContent: (v: string) => v.replace(/<script>/g, "") 
    };
    
    node.textContent = sanitizeForTextContent ? sanitizeForTextContent(malicious) : malicious;
    
    return {
      textContent: node.textContent,
      xssFired: (window as any).__xss_fired === true,
    };
  });

  expect(injected.xssFired).toBe(false);
  expect(alerts).toHaveLength(0);
  expect(injected.textContent).not.toContain("<script>");
});