import React from "react";

interface Props {
  heading: string;
  description: string;
}

export function EmptyState({ heading, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {/* SVG illustration — no emoji, no bitmap */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="text-gray-300 dark:text-gray-600"
      >
        <rect x="8" y="12" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M24 32 L32 24 L40 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 24 L32 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 52 L48 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold text-gray-700 dark:text-gray-300">{heading}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">{description}</p>
      </div>
    </div>
  );
}
