import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      // Passing the imported manifest object directly
      manifest: () => manifest, 
    }),
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
});
