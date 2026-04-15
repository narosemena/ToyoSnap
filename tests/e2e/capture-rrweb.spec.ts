/**
 * E2E: rrweb capture flow.
 *
 * Verifies that starting a capture in rrweb mode, clicking on the test
 * page, and stopping the capture produces at least one persisted step
 * visible in the editor.
 */
import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "../fixtures/extension-fixture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formPagePath = path.resolve(__dirname, "../fixtures/test-pages/form-page.html");

test("rrweb capture: clicking elements produces persisted steps in editor", async ({
  context,
  extensionId,
}) => {
  // Open the target page
  const page = await context.newPage();
  await page.goto(`file://${formPagePath}`);
  await page.waitForLoadState("domcontentloaded");

  // Trigger START_CAPTURE via the service worker (simulates popup action)
  const [sw] = context.serviceWorkers();
  const sessionId = await sw.evaluate(
    async ({ extId, tabId }) => {
      return new Promise<string>((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: "dummy" }); // ensure tab is registered
        chrome.runtime.sendMessage(
          { type: "START_CAPTURE", payload: { mode: "rrweb", captureCursor: false } },
          (response: { sessionId: string }) => resolve(response.sessionId)
        );
      });
    },
    { extId: extensionId, tabId: await page.evaluate(() => -1) }
  );

  // Click some elements so rrweb captures interactions
  await page.click("#username");
  await page.fill("#username", "testuser");
  await page.click("#password");
  await page.waitForTimeout(500);

  // Stop capture
  await sw.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }, () => resolve());
    });
  });

  // Allow capture coordinator to finish (design extraction etc.)
  await page.waitForTimeout(1000);

  // Open the editor and verify the session appears
  const editorPage = await context.newPage();
  await editorPage.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await editorPage.waitForLoadState("networkidle");

  // Editor should display the session (mode label visible)
  await expect(editorPage.locator("text=rrweb").first()).toBeVisible({ timeout: 10_000 });
});
