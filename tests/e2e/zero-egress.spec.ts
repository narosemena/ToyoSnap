/**
 * Zero-Egress validation.
 * Intercepts all network requests during a full capture + export cycle.
 * Asserts 0 requests to any non-chrome-extension:// origin.
 */
import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "../fixtures/extension-fixture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formPagePath = path.resolve(__dirname, "../fixtures/test-pages/form-page.html");

/**
 * Returns true for URLs that are allowed internal browser/extension origins.
 * Everything else (http:// / https:// / ws:// to external hosts) is a violation.
 */
function isAllowedOrigin(url: string, extensionId: string): boolean {
  return (
    url.startsWith(`chrome-extension://${extensionId}`) ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("file://")
  );
}

test("no external network requests during editor page load", async ({
  context,
  extensionId,
}) => {
  const externalRequests: string[] = [];

  context.on("request", (request) => {
    if (!isAllowedOrigin(request.url(), extensionId)) {
      externalRequests.push(request.url());
    }
  });

  // Open the editor — no external requests should occur
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await page.waitForLoadState("networkidle");

  expect(externalRequests).toHaveLength(0);
});

test("no external network requests during full capture and editor session", async ({
  context,
  extensionId,
}) => {
  const externalRequests: string[] = [];

  // Attach interceptor before any navigation so nothing slips through.
  context.on("request", (request) => {
    if (!isAllowedOrigin(request.url(), extensionId)) {
      externalRequests.push(request.url());
    }
  });

  // Phase 1: open target page
  const targetPage = await context.newPage();
  await targetPage.goto(`file://${formPagePath}`);
  await targetPage.waitForLoadState("domcontentloaded");

  // Phase 2: start capture via popup (only extension pages have chrome.runtime access)
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState("networkidle");

  await popupPage.evaluate(async (payload: { mode: string; captureCursor: boolean }) => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "START_CAPTURE", payload }, () => resolve());
    });
  }, { mode: "rrweb", captureCursor: false });

  // Phase 3: simulate user interactions on the target page
  await targetPage.click("#username");
  await targetPage.waitForTimeout(400);
  await targetPage.click("#email");
  await targetPage.waitForTimeout(400);

  // Phase 4: stop capture
  await popupPage.evaluate(async () => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }, () => resolve());
    });
  });
  await targetPage.waitForTimeout(600);

  // Phase 5: open the editor and verify it renders without making external calls
  const editorPage = await context.newPage();
  await editorPage.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await editorPage.waitForLoadState("networkidle");
  await expect(editorPage.locator("#root")).toBeVisible({ timeout: 10_000 });

  // The sidebar/export panel should be present
  await expect(editorPage.locator("aside").first()).toBeVisible({ timeout: 5_000 });

  // Final assertion: zero egress throughout the entire capture + editor cycle
  expect(
    externalRequests,
    `Zero-Egress violation — external requests detected: ${externalRequests.join(", ")}`
  ).toHaveLength(0);
});
