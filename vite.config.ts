/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import { execSync } from "child_process";
import manifest from "./src/manifest";
import pkg from "./package.json";
import type { Plugin } from "vite";

const buildHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();

/**
 * Chrome's extension loader rejects any file or directory at the extension
 * root whose name starts with "_". Vite emits "__vite-browser-external.js"
 * as a stub for Node built-ins — rename it and patch all import references.
 */
function chromeNoUnderscoreFiles(): Plugin {
  return {
    name: "chrome-no-underscore-files",
    enforce: "post",
    generateBundle(_opts, bundle) {
      for (const [name, chunk] of Object.entries(bundle)) {
        const base = name.split("/").pop()!;
        if (!base.startsWith("_")) continue;
        const newBase = base.replace(/^_+/, "");
        const newName = name.slice(0, name.length - base.length) + newBase;
        // Patch import references in all other chunks
        for (const c of Object.values(bundle)) {
          if (c.type === "chunk") {
            c.code = c.code
              .replaceAll(`"./${base}"`, `"./${newBase}"`)
              .replaceAll(`'./${base}'`, `'./${newBase}'`);
          }
        }
        bundle[newName] = { ...chunk, fileName: newName } as typeof chunk;
        delete bundle[name];
      }
    },
  };
}

/**
 * Chrome's extension loader rejects JS files containing the U+FFFE
 * non-character (reversed BOM, EF BF BE), even though it's valid UTF-8.
 * This character appears in the CSS parser bundled with rrweb — it
 * checks `css[0] === "\uFFFE"` for BOM detection. We escape it to the
 * JS unicode escape sequence, which preserves the runtime behaviour.
 */
function escapeNonCharacters(): Plugin {
  return {
    name: "escape-non-characters",
    enforce: "post",
    generateBundle(_opts, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.code.includes("\uFFFE")) {
          chunk.code = chunk.code.replaceAll("\uFFFE", "\\uFFFE");
        }
      }
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      // Passing the imported manifest object directly
      manifest: () => manifest,
      // Editor page is not a standard MV3 entry point — add it explicitly
      additionalInputs: ["src/editor/editor.html"],
    }),
    chromeNoUnderscoreFiles(),
    escapeNonCharacters(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Output directory for the compiled extension assets
    outDir: "dist",
    emptyOutDir: true,
    // Explicitly disable source maps — never ship them in a production extension;
    // they expose internal structure and add unnecessary size.
    sourcemap: false,
  },
  test: {
    // Exclude worktrees so vitest doesn't double-run tests from git worktrees
    exclude: [".worktrees/**", "node_modules/**"],
  },
});
