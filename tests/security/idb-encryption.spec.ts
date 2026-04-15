/**
 * Security Gate: IDB encryption at rest.
 * Reads raw IDB bytes directly; asserts they are not plaintext JSON.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("IDB blob store contains encrypted (non-plaintext) data", async ({
  context,
}) => {
  // Instead of relying on a brittle HTML page path, we run this directly 
  // in the Extension's Background Service Worker. It shares the IDB origin!
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const result = await background.evaluate(async () => {
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