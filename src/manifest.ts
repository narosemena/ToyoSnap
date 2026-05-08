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
  // RSA public key that pins the Chrome extension ID to "ocaimfeebaaanidmmklncfdempaeijdf".
  // Private key is stored in 1Password under "ToyoSnap release key" — never commit the .pem.
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtfTj/NezPCd4RxAQS1+4dzAEJjHMSIlj48OJy7DwjKBvqpnX4IyzvngvvPETstvmKOxlFe4cErrAdqX5DtUVSb0etXziTgeJX0BpMbJyA4OlAznwqy0wu/bzh1V4Vszx3uHGZRM5CANNWix5gXxRKulM3tK8bo0A7nL2jBqDYvQ4PuVPNL0ouPwJVk4g7AV/YfNZICuYFXQ5Y3Jd1w76FAqTMZCwIoUBDJYrGTKlBK8+b4nJmRNHw9Dz5QGwcFCEO9k27qvm+gfH7DstN1f/+puZy+8lUuCnXYEZyQhVQ2aS9gPzBao0sXlOEZHLOGKvb1alqXuTLdd+zvJbfuOSIQIDAQAB",
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
  commands: {
    'toggle-capture': {
      suggested_key: { default: 'Alt+Shift+R' },
      description: 'Start or stop ToyoSnap recording',
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
