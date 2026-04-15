/**
 * Security Gate: Manifest permission scope validation.
 * Asserts tabCapture is absent and assets/* WAR is absent.
 * Run first — blocks all other test suites on failure.
 */
import { test, expect } from "../fixtures/extension-fixture";
import path from "path";
import fs from "fs";

test("manifest does not include tabCapture permission", async () => {
  const manifestPath = path.resolve(__dirname, "../../dist/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    permissions?: string[];
  };
  expect(manifest.permissions ?? []).not.toContain("tabCapture");
});

test("web_accessible_resources does not expose assets/*", async () => {
  const manifestPath = path.resolve(__dirname, "../../dist/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    web_accessible_resources?: Array<{ resources: string[] }>;
  };
  const allResources = (manifest.web_accessible_resources ?? []).flatMap(
    (entry) => entry.resources
  );
  expect(allResources).not.toContain("assets/*");
});

test("CSP connect-src is self only (Zero-Egress)", async () => {
  const manifestPath = path.resolve(__dirname, "../../dist/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    content_security_policy?: { extension_pages?: string };
  };
  const csp = manifest.content_security_policy?.extension_pages ?? "";
  // Must contain connect-src 'self' and must NOT contain any external URL
  expect(csp).toContain("connect-src 'self'");
  expect(csp).not.toMatch(/connect-src[^;]*https?:\/\//);
});
