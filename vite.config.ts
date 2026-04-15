import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      manifest: () => {
        // Dynamic manifest import — typed in src/manifest.ts
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { buildManifest } = require("./src/manifest");
        return buildManifest();
      },
      additionalInputs: ["src/content/content-script.ts", "src/content/content-cursor-overlay.ts"],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false, // keep readable for security review
    rollupOptions: {
      output: {
        // Deterministic chunk names — required for CSP hash computation
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
