/**
 * E2E: image-chain capture flow.
 *
 * Verifies that a capture session in image-chain mode, driven by user
 * clicks on the test page, produces blob-backed steps that are retrievable
 * via EXPORT_SESSION_DATA.
 */
import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "../fixtures/extension-fixture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tablePage = path.resolve(__dirname, "../fixtures/test-pages/table-page.html");

test("image-chain capture: each click produces a step with a blobId", async ({
  context,
  extensionId,
}) => {
  // Open the target page
  const page = await context.newPage();
  await page.goto(`file://${tablePage}`);
  await page.waitForLoadState("domcontentloaded");

  const [sw] = context.serviceWorkers();

  // Start capture in image-chain mode
  const sessionId = await sw.evaluate(
    async ({ tabId }: { tabId: number }) => {
      return new Promise<string>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "START_CAPTURE", payload: { mode: "image-chain", captureCursor: false } },
          (response: { sessionId: string }) => resolve(response.sessionId)
        );
      });
    },
    { tabId: await page.evaluate(() => -1) }
  );

  expect(sessionId).toBeTruthy();

  // Perform two clicks — image-chain captures a screenshot per click
  await page.click("body");
  await page.waitForTimeout(800);
  await page.click("body");
  await page.waitForTimeout(800);

  // Stop capture
  await sw.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }, () => resolve());
    });
  });

  // Give the capture coordinator time to persist
  await page.waitForTimeout(1500);

  // Retrieve steps via service worker message
  const steps = await sw.evaluate(
    async ({ sid }: { sid: string }) => {
      return new Promise<Array<{ stepIndex: number; blobId: string | null }>>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "EXPORT_SESSION_DATA", payload: { sessionId: sid } },
          (response: { steps: Array<{ stepIndex: number; blobId: string | null }> }) => {
            resolve(response.steps ?? []);
          }
        );
      });
    },
    { sid: sessionId }
  );

  // Expect at least one step, all with a blobId (image-chain stores screenshots)
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) {
    expect(step.blobId).not.toBeNull();
  }
});
