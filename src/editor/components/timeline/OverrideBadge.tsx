import React from "react";

/**
 * Indicates a step has local PII overrides.
 * Uses both color AND icon to satisfy WCAG 1.4.1 (Use of Color).
 */
export function OverrideBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
      aria-label="Has local overrides"
      title="This step has local PII overrides"
    >
      {/* Pencil/edit icon — required alongside color for WCAG 1.4.1 */}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708L12.854.146zM11.5 4.207 7.793 7.914l-.5 2.293 2.293-.5L13.293 6 11.5 4.207zM1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z" />
      </svg>
      Override
    </span>
  );
}
