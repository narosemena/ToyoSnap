import React, { useState } from "react";

const SHORTCUTS = [
  { keys: "Ctrl/Cmd+Z", action: "Undo last PII operation" },
  { keys: "Ctrl/Cmd+Shift+Z", action: "Redo" },
  { keys: "Escape", action: "Deselect / cancel active tool" },
  { keys: "Ctrl/Cmd+S", action: "Open export panel" },
  { keys: "← / →", action: "Previous / next step" },
  { keys: "B", action: "Activate blur tool" },
  { keys: "R", action: "Activate redact tool" },
  { keys: "G", action: "Toggle Apply Globally" },
];

export function KeyboardShortcutsHint() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="shortcuts-panel"
        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="5" width="2" height="2" rx="0.5" fill="currentColor" />
          <rect x="7" y="5" width="2" height="2" rx="0.5" fill="currentColor" />
          <rect x="11" y="5" width="2" height="2" rx="0.5" fill="currentColor" />
          <rect x="3" y="9" width="10" height="2" rx="0.5" fill="currentColor" />
        </svg>
        Keyboard shortcuts
      </button>

      {open && (
        <div
          id="shortcuts-panel"
          className="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        >
          <table className="w-full text-xs">
            <tbody>
              {SHORTCUTS.map(({ keys, action }) => (
                <tr key={keys} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="py-1 pr-4 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {keys}
                  </td>
                  <td className="py-1 text-gray-600 dark:text-gray-400">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
