import { test as base, chromium, type BrowserContext, expect } from "@playwright/test";
import path from "path";

/**
 * ExtensionFixtures defines the custom properties available to ToyoSnap tests.
 * zeroEgress: An array that tracks any network requests violating the 'self' policy.
 */
export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  zeroEgress: string[];
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const extensionPath = path.resolve(__dirname, "../../dist");
    const context = await chromium.launchPersistentContext("", {
      // Manifest V3 extensions require headed mode (headless: false).
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for the Manifest V3 service worker to register.
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = serviceWorker.url().split("/")[2]!;
    await use(extensionId);
  },

  zeroEgress: async ({ context }, use) => {
    const leakedRequests: string[] = [];

    // Attach a listener to monitor the 'connect-src' invariant globally.
    await context.on("request", (request) => {
      const url = new URL(request.url());
      const isExtensionOrigin = url.protocol === "chrome-extension:";
      const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      const isDataUri = url.protocol === "data:";

      // If a request is not to the extension origin or local testing host, it is a leak.
      if (!isExtensionOrigin && !isLocalhost && !isDataUri) {
        leakedRequests.push(request.url());
      }
    });

    await use(leakedRequests);

    // Final assertion for every test: The leak array must be empty to pass.
    expect(
      leakedRequests, 
      `Zero-Egress Violation: Data leaked to external endpoints: ${leakedRequests.join(", ")}`
    ).toHaveLength(0);
  },
});

export { expect } from "@playwright/test";
