import type { Manifest } from "vite-plugin-web-extension";

export function buildManifest(): Manifest {
  return {
    manifest_version: 3,
    name: "ToyoSnap",
    version: "0.1.0",
    description: "Zero-Egress WorkflowCapture Engine for instructional designers",
    minimum_chrome_version: "116",

    // tabCapture is intentionally absent — captureVisibleTab only needs activeTab + <all_urls>
    permissions: ["tabs", "activeTab", "scripting", "storage"],
    host_permissions: ["<all_urls>"],

    background: {
      service_worker: "src/background/service-worker.ts",
      type: "module",
    },

    action: {
      default_popup: "src/popup/popup.html",
      default_icon: {
        "16": "public/icons/icon16.png",
        "32": "public/icons/icon32.png",
        "48": "public/icons/icon48.png",
        "128": "public/icons/icon128.png",
      },
    },

    icons: {
      "16": "public/icons/icon16.png",
      "32": "public/icons/icon32.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png",
    },

    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["src/content/content-script.ts"],
        run_at: "document_idle",
        all_frames: false, // intentional — iframe capture not supported (documented limitation)
      },
    ],

    // assets/* is intentionally absent — only explicitly needed files are exposed
    web_accessible_resources: [
      {
        resources: ["src/editor/editor.html"],
        matches: ["<all_urls>"],
      },
      {
        // rrweb-player assets needed by the standalone HTML replay export
        resources: ["assets/rrweb-player.js", "assets/rrweb-player.css"],
        matches: ["<all_urls>"],
      },
    ],

    content_security_policy: {
      extension_pages: [
        "default-src 'self'",
        "script-src 'self'",
        // unsafe-inline retained as fallback; replace with build-time hash when Tailwind v4 output is stable
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "media-src 'self' blob:",
        // connect-src 'self' enforces Zero-Egress — never relax this
        "connect-src 'self'",
        "font-src 'self' data:",
        "object-src 'none'",
        // blob: required for rrweb-player iframe — documented intentional exception
        "frame-src 'self' blob:",
      ].join("; "),
    },
  };
}
