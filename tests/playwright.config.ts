import { defineConfig, devices } from "@playwright/test";
import path from "path";

const EXTENSION_PATH = path.resolve(__dirname, "../dist");

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Extension tests CANNOT run headless — Chrome ignores extensions in headless mode
    headless: false,
    launchOptions: {
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
