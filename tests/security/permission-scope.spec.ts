/**
 * Security Gate: Manifest permission scope validation.
 * Asserts tabCapture is absent and CSP is strictly local.
 * Run first — blocks all other test suites on failure.
 */
import { test, expect } from "../fixtures/extension-fixture";
import path from "path";
import fs from "fs";

test.describe("Security: Permission & Network Scope", () => {
  const manifestPath = path.resolve(__dirname, "../../dist/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  test("manifest does not include tabCapture permission", async () => {
    expect(manifest.permissions ?? []).not.toContain("tabCapture");
  });

  test("web_accessible_resources does not expose assets/*", async () => {
    const allResources = (manifest.web_accessible_resources ?? []).flatMap(
      (entry: { resources: string[] }) => entry.resources
    );
    expect(allResources).not.toContain("assets/*");
  });

  test("CSP connect-src is self only (Zero-Egress Verification)", async ({ page, zeroEgress }) => {
    const csp = manifest.content_security_policy?.extension_pages ?? "";
    
    // Static Manifest Check
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/connect-src[^;]*https?:\/\//);

    // Active Network Monitor Check
    await page.goto("https://example.com");
    // zeroEgress fixture will fail this test if any leaks occur during navigation.
  });
});
