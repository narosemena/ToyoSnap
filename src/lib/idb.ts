import { openDB, type IDBPDatabase } from "idb";
import type { IDBSchema } from "@/types/storage";

const DB_NAME = "toyosnap";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<IDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<IDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<IDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // sessions  -  keyed by session id
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "id" });
        }

        // steps  -  compound key [sessionId, stepIndex]
        if (!db.objectStoreNames.contains("steps")) {
          const store = db.createObjectStore("steps", { keyPath: ["sessionId", "stepIndex"] });
          store.createIndex("sessionId", "sessionId");
        } else if (oldVersion < 2) {
          const store = transaction.objectStore("steps");
          if (!store.indexNames.contains("sessionId")) {
            store.createIndex("sessionId", "sessionId");
          }
        }

        // blobs  -  keyed by blobId; value is encrypted ArrayBuffer
        if (!db.objectStoreNames.contains("blobs")) {
          db.createObjectStore("blobs");
        }

        // globalLedger  -  keyed by LedgerEntry.id
        if (!db.objectStoreNames.contains("globalLedger")) {
          db.createObjectStore("globalLedger", { keyPath: "id" });
        }

        // localLedger  -  compound key [sessionId, stepId, rrwebId]
        if (!db.objectStoreNames.contains("localLedger")) {
          const store = db.createObjectStore("localLedger", { keyPath: ["sessionId", "stepId", "rrwebId"] });
          store.createIndex("sessionId", "sessionId");
        } else if (oldVersion < 2) {
          const store = transaction.objectStore("localLedger");
          if (!store.indexNames.contains("sessionId")) {
            store.createIndex("sessionId", "sessionId");
          }
        }

        // designSystems  -  keyed by sessionId
        if (!db.objectStoreNames.contains("designSystems")) {
          db.createObjectStore("designSystems", { keyPath: "sessionId" });
        }

        // actionLogs  -  keyed by sessionId
        if (!db.objectStoreNames.contains("actionLogs")) {
          db.createObjectStore("actionLogs");
        }
      },
    });
  }
  return dbPromise;
}
