import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExportSensitivityWarning({ onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState(false);
  const acknowledge = useEditorStore((s) => s.acknowledgeExportSensitivity);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus to Cancel on mount so keyboard users land inside the dialog
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleConfirm() {
    if (!checked) return;
    acknowledge();
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sensitivity-title"
      aria-describedby="sensitivity-desc"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 id="sensitivity-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Sensitive data warning
        </h2>
        <p id="sensitivity-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This export contains captured workflow data. Treat it as sensitive. Do not share via
          unsecured channels.
        </p>
        <label className="mt-4 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            I understand — don't show again for this session
          </span>
        </label>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!checked}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
