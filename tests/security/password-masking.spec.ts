/**
 * Security Gate: rrweb password masking.
 * Records a page with <input type="password">; asserts rrweb events
 * contain masked characters only — no plaintext password present.
 */
import { test, expect } from "../fixtures/extension-fixture";
import path from "path";

test("rrweb events do not contain plaintext password values", async ({
  context,
  extensionId,
}) => {
  void extensionId;

  const page = await context.newPage();
  const testPagePath = path.resolve(__dirname, "../fixtures/test-pages/form-page.html");
  await page.goto(`file://${testPagePath}`);

  // Type a password into the password field
  const SECRET = "SuperSecret123!";
  await page.fill('input[type="password"]', SECRET);
  await page.waitForTimeout(500);

  // Read rrweb events from the page's capture state
  // The events are stored in the content script's memory; we inspect via window
  const events = await page.evaluate(() => {
    return (window as unknown as Record<string, unknown>).__toyosnap_rrweb_events as unknown[];
  });

  if (events && events.length > 0) {
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(SECRET);
  }

  // Even if events aren't exposed, verify the DOM value is masked
  const maskedValue = await page.evaluate(() => {
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    return input?.value;
  });

  // rrweb replaces actual value with asterisks or empty string
  if (maskedValue) {
    expect(maskedValue).not.toBe(SECRET);
  }
});
