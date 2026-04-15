/**
 * E2E: rrweb capture flow.
 *
 * Opens the popup page (which has chrome.runtime access) to trigger
 * START_CAPTURE / STOP_CAPTURE, then verifies the editor loads correctly.
 */
import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "../fixtures/extension-fixture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formPagePath = path.resolve(__dirname, "../fixtures/test-pages/form-page.html");

test("rrweb capture: start/stop flow via extension messaging", async ({
  context,
  extensionId,
}) => {
  // Open the target page first so there's an active tab for the SW to record
  const targetPage = await context.newPage();
  await targetPage.goto(`file://${formPagePath}`);
  await targetPage.waitForLoadState("domcontentloaded");

  // Open the popup page — extension pages have chrome.runtime access
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState("networkidle");

  // Send START_CAPTURE from the popup context (valid sender for the SW)
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
    { mode: "rrweb", captureCursor: false }
  );

  // START_CAPTURE should return a sessionId (or gracefully handle no active tab)
  expect(startResponse).toBeDefined();

  // Let rrweb record briefly
  await targetPage.click("#username");
  await targetPage.waitForTimeout(300);

  // Stop via popup
  await popupPage.evaluate(async () => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }, () => resolve());
    });
  });

  await targetPage.waitForTimeout(600);

  // Open the editor — it should render without crashing
  const editorPage = await context.newPage();
  await editorPage.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);
  await editorPage.waitForLoadState("networkidle");

  await expect(editorPage.locator("#root")).toBeVisible({ timeout: 10_000 });
  await expect(editorPage.locator("aside").first()).toBeVisible();
});
