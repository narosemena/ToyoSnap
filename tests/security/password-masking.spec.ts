/**
 * Security Gate: rrweb password masking.
 */
import { test, expect } from "../fixtures/extension-fixture";
import path from "path";

test("rrweb events do not contain plaintext password values", async ({
  page,
  zeroEgress
}) => {
  const testPagePath = path.resolve(__dirname, "../fixtures/test-pages/form-page.html");
  await page.goto(`file://${testPagePath}`);

  const SECRET = "ToyotaSecurePassword2026!";
  await page.fill('input[type="password"]', SECRET);

  const events = await page.evaluate(() => {
    return (window as any).__toyosnap_rrweb_events;
  });

  if (events) {
    const serialized = JSON.stringify(events);
    expect(serialized, "Password found in rrweb stream!").not.toContain(SECRET);
  }

  const maskedValue = await page.inputValue('input[type="password"]');
  expect(maskedValue).not.toBe(SECRET);
});
