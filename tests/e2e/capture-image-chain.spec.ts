/**
 * E2E: image-chain capture flow.
 *
 * Opens the popup page (which has chrome.runtime access) to trigger
 * START_CAPTURE in image-chain mode, then verifies the editor loads.
 */
import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "../fixtures/extension-fixture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tablePage = path.resolve(__dirname, "../fixtures/test-pages/table-page.html");

test("image-chain capture: start/stop flow via extension messaging", async ({
  context,
  extensionId,
}) => {
  // Open the target page so there is an active tab
  const targetPage = await context.newPage();
  await targetPage.goto(`file://${tablePage}`);
  await targetPage.waitForLoadState("domcontentloaded");

  // Open the popup — extension pages have chrome.runtime access
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState("networkidle");

  // Send START_CAPTURE in image-chain mode
  const startResponse = await popupPage.evaluate(
    async (payload: { mode: string; captureCursor: boolean }) => {
      return new Promise<{ sessionId?: string; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "START_CAPTURE", payload },
          (response: { sessionId?: string }) => {
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message });
            } else {
              resolve(response ?? {});
            }
          }
        );
      });
    },
    { mode: "image-chain", captureCursor: false }
  );

  expect(startResponse).toBeDefined();

  // Click the target page a couple of times
  await targetPage.click("body");
  await targetPage.waitForTimeout(600);

  // Stop
  await popupPage.evaluate(async () => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }, () => resolve());
    });
  });

  await targetPage.waitForTimeout(600);

  // Editor should load without errors
  const editorPage = await context.newPage();
  await editorPage.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await editorPage.waitForLoadState("networkidle");

  await expect(editorPage.locator("#root")).toBeVisible({ timeout: 10_000 });
  // No unhandled error text visible in the UI
  await expect(editorPage.locator("text=Unhandled")).not.toBeVisible();
});
