import { useEffect, useState } from "react";
import type { LedgerEntry } from "@/types/ledger";
import { getAllGlobal } from "./global-ledger";

export function useGlobalLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getAllGlobal().then((e) => {
      setEntries(e);
      setLoading(false);
    });
  }, []);

  return { entries, loading };
}
