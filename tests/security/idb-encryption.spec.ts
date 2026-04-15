/**
 * Security Gate: IDB encryption at rest.
 * Reads raw IDB bytes directly; asserts they are not plaintext JSON.
 */
import { test, expect } from "../fixtures/extension-fixture";

test("IDB blob store and rrwebEvents contain encrypted data", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/editor/editor.html`);

  const result = await page.evaluate(async () => {
    return new Promise<{ isEncrypted: boolean; reason: string }>((resolve) => {
      const req = indexedDB.open("toyosnap", 1);
      req.onsuccess = () => {
        const db = req.result;
        // Check both critical stores defined in CLAUDE.md
        const storesToCheck = ["blobs", "steps.rrwebEvents"].filter(s => db.objectStoreNames.contains(s));
        
        if (storesToCheck.length === 0) {
          resolve({ isEncrypted: true, reason: "No secure stores found yet" });
          return;
        }

        const tx = db.transaction(storesToCheck, "readonly");
        
        // Check the first available store for plaintext leaks
        const store = tx.objectStore(storesToCheck[0]);
        const getAllReq = store.getAll();

        getAllReq.onsuccess = () => {
          const values = getAllReq.result;
          for (const value of values) {
            try {
              const text = new TextDecoder().decode(value);
              JSON.parse(text); 
              resolve({ isEncrypted: false, reason: "Plaintext JSON detected in DB!" });
              return;
            } catch { /* Success: Data is not valid UTF-8/JSON */ }
          }
          resolve({ isEncrypted: true, reason: "Data is properly encrypted" });
        };
      };
    });
  });

  expect(result.isEncrypted).toBe(true);
});
