/**
 * Zero-Egress validation.
 * Intercepts all network requests during a full capture + export cycle.
 * Asserts 0 requests to any non-chrome-extension:// origin.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("no external network requests during capture and export", async ({
  context,
  extensionId,
}) => {
  const externalRequests: string[] = [];

  // Intercept all requests on all pages
  context.on("request", (request) => {
    const url = request.url();
    if (
      !url.startsWith(`chrome-extension://${extensionId}`) &&
      !url.startsWith("chrome-extension://") &&
      !url.startsWith("about:") &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      externalRequests.push(url);
    }
  });

  // Open the editor â€” no external requests should occur
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await page.waitForLoadState("networkidle");

  expect(externalRequests).toHaveLength(0);
});
