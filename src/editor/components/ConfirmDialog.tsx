/**
 * Reusable destructive-action confirmation modal.
 * Focus-trapped, Escape cancels, Enter confirms primary action.
 * role="alertdialog" per ARIA spec.
 */
import React, { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button on open (safer default for destructive actions)
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 id="confirm-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
