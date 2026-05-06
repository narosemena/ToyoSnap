/**
 * ToyoSnap Manifest V3 Configuration
 * Enforces Zero-Egress isolation via strict Content Security Policy.
 * NOTE: connect-src includes AI API endpoints — deliberate opt-in for the AI PII scanner feature.
 * These endpoints are only reached when the user enables AI features in the options page.
 */
export default {
  manifest_version: 3,
  name: "ToyoSnap",
  version: "0.1.0",
  description: "Zero-Egress WorkflowCapture Engine  -  browser extension for instructional designers",
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
  options_page: "src/options/options.html",
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
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src 'self' https://api.anthropic.com https://api.openai.com https://*.amazonaws.com;",
  },
  web_accessible_resources: [
    {
      resources: ["icons/*.png", "src/editor/editor.html", "src/welcome/welcome.html"],
      matches: ["<all_urls>"],
    },
  ],
};
