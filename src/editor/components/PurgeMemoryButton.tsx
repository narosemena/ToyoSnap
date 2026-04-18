import React, { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { purgeAll } from "@/storage/purge";
import { announce } from "./LiveAnnouncer";
import { usePIIStore } from "../store/pii-store";

interface Props {
  onPurged?: () => void;
}

export function PurgeMemoryButton({ onPurged }: Props) {
  const [open, setOpen] = useState(false);
  const clearStacks = usePIIStore((s) => s.clearStacks);

  async function handleConfirm() {
    setOpen(false);
    await purgeAll();
    clearStacks();
    onPurged?.();
    announce("All captured data has been purged.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        Purge Memory
      </button>

      <ConfirmDialog
        open={open}
        title="Purge all captured data?"
        description="This will permanently delete all captured sessions and cannot be undone."
        confirmLabel="Purge"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
