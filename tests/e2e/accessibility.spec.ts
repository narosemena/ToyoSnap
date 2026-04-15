/**
 * Accessibility validation via axe-core.
 * Asserts zero critical/serious violations on editor.html and popup.html
 * in both light and dark mode (via prefers-color-scheme media emulation).
 */
import { test, expect } from "../fixtures/extension-fixture";
import AxeBuilder from "@axe-core/playwright";

async function runAxe(page: Parameters<typeof AxeBuilder>[0]["page"], url: string, colorScheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme });
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) =>
    (["critical", "serious"] as Array<typeof v.impact>).includes(v.impact)
  );
  return serious;
}

test("editor.html has zero critical/serious axe violations in light mode", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const violations = await runAxe(
    page,
    `chrome-extension://${extensionId}/src/editor/editor.html`,
    "light"
  );
  expect(violations).toHaveLength(0);
});

test("editor.html has zero critical/serious axe violations in dark mode", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const violations = await runAxe(
    page,
    `chrome-extension://${extensionId}/src/editor/editor.html`,
    "dark"
  );
  expect(violations).toHaveLength(0);
});

test("popup.html has zero critical/serious axe violations in light mode", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const violations = await runAxe(
    page,
    `chrome-extension://${extensionId}/src/popup/popup.html`,
    "light"
  );
  expect(violations).toHaveLength(0);
});

test("popup.html has zero critical/serious axe violations in dark mode", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const violations = await runAxe(
    page,
    `chrome-extension://${extensionId}/src/popup/popup.html`,
    "dark"
  );
  expect(violations).toHaveLength(0);
});
