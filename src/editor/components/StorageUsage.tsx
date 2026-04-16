import React, { useEffect, useState } from "react";

function fmt(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageUsage() {
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);

  useEffect(() => {
    void navigator.storage.estimate().then(({ usage: u, quota: q }) => {
      setUsage(u ?? null);
      setQuota(q ?? null);
    });
  }, []);

  if (usage === null || quota === null) return null;

  const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
  const barColor = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-400" : "bg-blue-500";

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <div className="flex justify-between">
        <span>{fmt(usage)} used</span>
        <span>{fmt(quota)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% storage used`}
        />
      </div>
    </div>
  );
}
