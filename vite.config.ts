import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import manifest from "./src/manifest";
import type { Plugin } from "vite";

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
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      // Passing the imported manifest object directly
      manifest: () => manifest,
      // Editor page is not a standard MV3 entry point — add it explicitly
      additionalInputs: ["src/editor/editor.html"],
    }),
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
  },
  test: {
    // Exclude worktrees so vitest doesn't double-run tests from git worktrees
    exclude: [".worktrees/**", "node_modules/**"],
  },
});
