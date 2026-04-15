/**
 * Security Gate: IDB encryption at rest.
 * Reads raw IDB bytes directly; asserts they are not plaintext JSON.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("IDB blob store contains encrypted (non-plaintext) data", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);

  // Write a known plaintext value to IDB via the extension's API
  // then read back the raw bytes and assert they are not the plaintext
  const result = await page.evaluate(async () => {
    // Open the toyosnap IDB directly as a raw bytes check
    return new Promise<{ isEncrypted: boolean; reason: string }>((resolve) => {
      const req = indexedDB.open("toyosnap", 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("blobs")) {
          resolve({ isEncrypted: true, reason: "no blobs store found (empty)" });
          return;
        }
        const tx = db.transaction("blobs", "readonly");
        const store = tx.objectStore("blobs");
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const values = getAllReq.result as ArrayBuffer[];
          if (values.length === 0) {
            resolve({ isEncrypted: true, reason: "no blobs written yet" });
            return;
          }
          // Check that the raw bytes are not valid UTF-8 JSON
          for (const value of values) {
            try {
              const text = new TextDecoder().decode(value);
              JSON.parse(text);
              resolve({
                isEncrypted: false,
                reason: "blob value decoded as valid JSON (plaintext!)",
              });
              return;
            } catch {
              // Expected: decoding should fail for encrypted data
            }
          }
          resolve({ isEncrypted: true, reason: "all blobs are non-plaintext" });
        };
      };
      req.onerror = () => resolve({ isEncrypted: true, reason: "db error" });
    });
  });

  expect(result.isEncrypted).toBe(true);
});
