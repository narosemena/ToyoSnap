/**
 * ToyoSnap Manifest V3 Configuration
 * Enforces Zero-Egress isolation via strict Content Security Policy.
 */
export default {
  manifest_version: 3,
  name: "ToyoSnap",
  version: "0.1.0",
  description: "Zero-Egress WorkflowCapture Engine  -  browser extension for instructional designers",
  // Top-level icons used by Chrome in the toolbar, extensions page, and CWS listing.
  // Replace placeholder PNGs with final brand assets before CWS submission.
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  permissions: ["storage", "activeTab", "scripting", "tabs"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "src/popup/popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content-script.ts"],
    },
  ],
  // Mandatory Zero-Egress CSP to prevent external data exfiltration
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self';",
  },
  web_accessible_resources: [
    {
      resources: ["icons/*.png", "src/editor/editor.html"],
      matches: ["<all_urls>"],
    },
  ],
};
