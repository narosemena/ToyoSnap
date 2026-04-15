/**
 * Security Gate: Message injection prevention.
 * Asserts the SW ignores START_CAPTURE sent from untrusted contexts.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("service worker drops START_CAPTURE from untrusted page context", async ({
  page,
  zeroEgress
}) => {
  await page.goto("about:blank");

  const result = await page.evaluate(() => {
    return new Promise<string>((resolve) => {
      try {
        // Attempting to spoof an internal message from a generic page
        chrome.runtime.sendMessage(
          { type: "START_CAPTURE", payload: { mode: "rrweb" } },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve("blocked");
            } else {
              resolve(JSON.stringify(response));
            }
          }
        );
      } catch (e) {
        resolve("threw");
      }
    });
  });

  // Verify no session was initiated by the unauthorized message
  expect(result).not.toContain("sessionId");
});
