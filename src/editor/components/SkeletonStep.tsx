import React from "react";

export function SkeletonStep() {
  return (
    <div
      aria-hidden="true"
      className="motion-safe:animate-pulse flex gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-3/4" />
        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-1/2" />
      </div>
    </div>
  );
}
