/**
 * ToyoSnap Manifest V3 Configuration
 * Enforces Zero-Egress isolation via strict Content Security Policy.
 */
export default {
  manifest_version: 3,
  name: "ToyoSnap",
  version: "0.1.0",
  description: "Zero-Egress WorkflowCapture Engine  -  browser extension for instructional designers",
  permissions: ["storage", "activeTab", "scripting", "tabs"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "src/popup/popup.html",
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
      resources: ["icons/*.png"],
      matches: ["<all_urls>"],
    },
  ],
};
