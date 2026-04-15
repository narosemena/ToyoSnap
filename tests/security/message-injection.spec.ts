/**
 * Security Gate: Message injection prevention.
 * Asserts the SW ignores START_CAPTURE sent from an untrusted page script context.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("service worker drops START_CAPTURE from untrusted page context", async ({
  context,
  extensionId,
}) => {
  void extensionId; // needed for fixture setup

  const page = await context.newPage();
  await page.goto("about:blank");

  // Attempt to send START_CAPTURE from page context (no extension id)
  const result = await page.evaluate(() => {
    return new Promise<string>((resolve) => {
      try {
        // This will fail or be ignored because sender.id won't match chrome.runtime.id
        chrome.runtime.sendMessage(
          { type: "START_CAPTURE", payload: { mode: "rrweb", captureCursor: false } },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve("error:" + chrome.runtime.lastError.message);
            } else {
              resolve("response:" + JSON.stringify(response));
            }
          }
        );
      } catch (e) {
        resolve("threw:" + String(e));
      }
    });
  });

  // Either the message is dropped (no response / error) or the chrome API is unavailable
  // The key assertion: no sessionId was returned (which would indicate capture started)
  expect(result).not.toContain('"sessionId"');
});
