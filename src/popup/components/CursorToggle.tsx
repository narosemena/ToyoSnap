import React from "react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}

export function CursorToggle({ checked, onChange, disabled }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-blue-600 w-4 h-4 disabled:opacity-50"
      />
      <span className="text-gray-700 dark:text-gray-300">Show cursor overlay</span>
    </label>
  );
}
