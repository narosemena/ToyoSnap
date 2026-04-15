import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock the storage layer
vi.mock("../../src/storage/ephemeral-db", () => ({
  getLocalLedgerEntry: vi.fn(),
  getAllGlobalLedgerEntries: vi.fn(),
  putGlobalLedgerEntry: vi.fn(),
  putLocalLedgerEntry: vi.fn(),
}));

import { resolveEntry } from "../../src/ledger/ledger-resolver";
import * as db from "../../src/storage/ephemeral-db";
import type { LedgerEntry } from "../../src/types/ledger";

const LOCAL_ENTRY: LedgerEntry = {
  id: "local-1",
  operationType: "blur",
  rrwebId: "node-abc",
  elementSelector: "#foo",
  applyGlobally: false,
  replacementText: "",
  createdAt: 1000,
  updatedAt: 1000,
};

const GLOBAL_ENTRY: LedgerEntry = {
  id: "global-1",
  operationType: "redact",
  rrwebId: "node-abc",
  elementSelector: "#foo",
  applyGlobally: true,
  replacementText: "[PII_REMOVED]",
  createdAt: 900,
  updatedAt: 900,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveEntry", () => {
  test("local override wins over global", async () => {
    vi.mocked(db.getLocalLedgerEntry).mockResolvedValue(LOCAL_ENTRY);
    vi.mocked(db.getAllGlobalLedgerEntries).mockResolvedValue([GLOBAL_ENTRY]);

    const result = await resolveEntry("session-1", "step-1", "node-abc");
    expect(result?.id).toBe("local-1");
    expect(result?.operationType).toBe("blur");
  });

  test("global entry returned when no local override", async () => {
    vi.mocked(db.getLocalLedgerEntry).mockResolvedValue(undefined);
    vi.mocked(db.getAllGlobalLedgerEntries).mockResolvedValue([GLOBAL_ENTRY]);

    const result = await resolveEntry("session-1", "step-1", "node-abc");
    expect(result?.id).toBe("global-1");
    expect(result?.operationType).toBe("redact");
  });

  test("returns null when no local or global match", async () => {
    vi.mocked(db.getLocalLedgerEntry).mockResolvedValue(undefined);
    vi.mocked(db.getAllGlobalLedgerEntries).mockResolvedValue([]);

    const result = await resolveEntry("session-1", "step-1", "node-abc");
    expect(result).toBeNull();
  });

  test("returns null when rrwebId is null", async () => {
    const result = await resolveEntry("session-1", "step-1", null);
    expect(result).toBeNull();
  });
});
