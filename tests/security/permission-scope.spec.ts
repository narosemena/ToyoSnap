import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruct __dirname and __filename in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Security: Permission & Network Scope", () => {
   // Resolve the path to the compiled manifest in the dist/ folder
   const manifestPath = path.resolve(__dirname, "../../dist/manifest.json");
   const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

   test("manifest does not include tabCapture permission", async () => {
       // Safely default to an empty array if permissions is undefined
       const permissions = manifest.permissions || [];
       expect(permissions).not.toContain("tabCapture");
   });

   test("manifest enforces a strict Content Security Policy (CSP)", async () => {
       // Validate that the Zero-Egress CSP is strictly enforcing local-only execution
       const csp = manifest.content_security_policy?.extension_pages || "";
       
       // Updated to match actual MV3 standard string
       expect(csp).toContain("script-src 'self'");
       expect(csp).toContain("connect-src 'self'");
   });
});