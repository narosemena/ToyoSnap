import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  // Uses OS prefers-color-scheme — no class toggling needed
  darkMode: "media",
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
