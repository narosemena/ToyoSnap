import { openDB, type IDBPDatabase } from "idb";
import type { IDBSchema } from "@/types/storage";

const DB_NAME = "toyosnap";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<IDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<IDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // sessions â€” keyed by session id
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "id" });
        }

        // steps â€” compound key [sessionId, stepIndex]
        if (!db.objectStoreNames.contains("steps")) {
          db.createObjectStore("steps", { keyPath: ["sessionId", "stepIndex"] });
        }

        // blobs â€” keyed by blobId; value is encrypted ArrayBuffer
        if (!db.objectStoreNames.contains("blobs")) {
          db.createObjectStore("blobs");
        }

        // globalLedger â€” keyed by LedgerEntry.id
        if (!db.objectStoreNames.contains("globalLedger")) {
          db.createObjectStore("globalLedger", { keyPath: "id" });
        }

        // localLedger â€” compound key [sessionId, stepId, rrwebId]
        if (!db.objectStoreNames.contains("localLedger")) {
          db.createObjectStore("localLedger", { keyPath: ["sessionId", "stepId", "rrwebId"] });
        }

        // designSystems â€” keyed by sessionId
        if (!db.objectStoreNames.contains("designSystems")) {
          db.createObjectStore("designSystems", { keyPath: "sessionId" });
        }

        // actionLogs â€” keyed by sessionId
        if (!db.objectStoreNames.contains("actionLogs")) {
          db.createObjectStore("actionLogs");
        }
      },
    });
  }
  return dbPromise;
}
