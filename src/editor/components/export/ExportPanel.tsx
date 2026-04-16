import React, { useEffect, useState } from "react";
import { useEditorStore } from "@/editor/store/editor-store";
import { ExportSensitivityWarning } from "./ExportSensitivityWarning";
import { exportPptx } from "@/export-engine/pptx-exporter";
import { exportPngZip } from "@/export-engine/png-zip-exporter";
import { exportBmpZip } from "@/export-engine/bmp-zip-exporter";
import { exportSvgZip } from "@/export-engine/svg-zip-exporter";
import { getSession } from "@/storage/ephemeral-db";
import type { CaptureMode } from "@/types/capture";

interface ExportFormat {
  id: string;
  label: string;
  description: string;
  ext: string;
  run: (sessionId: string) => Promise<Blob>;
  /** If set, only show when session mode matches */
  onlyForMode?: CaptureMode;
}

const FORMATS: ExportFormat[] = [
  {
    id: "png",
    label: "PNG Screenshots",
    description: "ZIP of step images with PII overlays baked in",
    ext: "zip",
    run: exportPngZip,
  },
  {
    id: "bmp",
    label: "BMP Screenshots",
    description: "ZIP of 24-bit BMP images with PII overlays baked in",
    ext: "zip",
    run: exportBmpZip,
  },
  {
    id: "pptx",
    label: "PowerPoint",
    description: "One slide per step with PII overlays baked in",
    ext: "pptx",
    run: exportPptx,
  },
  {
    id: "svg",
    label: "SVG Layers",
    description: "ZIP of layered SVG files with PII overlays injected",
    ext: "zip",
    run: exportSvgZip,
    onlyForMode: "svg",
  },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const { activeSessionId, exportSensitivityAcknowledged } = useEditorStore();
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<CaptureMode | null>(null);

  useEffect(() => {
    if (!activeSessionId) { setSessionMode(null); return; }
    void getSession(activeSessionId).then((s) => setSessionMode(s?.mode ?? null));
  }, [activeSessionId]);

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        No session selected.
      </div>
    );
  }

  const visibleFormats = FORMATS.filter(
    (fmt) => !fmt.onlyForMode || fmt.onlyForMode === sessionMode
  );

  async function runExport(format: ExportFormat) {
    if (!activeSessionId) return;
    setExportingId(format.id);
    setError(null);
    try {
      const blob = await format.run(activeSessionId);
      const ts = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `toyosnap-${activeSessionId.slice(0, 8)}-${ts}.${format.ext}`);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingId(null);
    }
  }

  function handleExportClick(format: ExportFormat) {
    if (!exportSensitivityAcknowledged) {
      setPendingFormat(format);
    } else {
      void runExport(format);
    }
  }

  return (
    <section aria-label="Export options">
      {pendingFormat && (
        <ExportSensitivityWarning
          onConfirm={() => {
            const f = pendingFormat;
            setPendingFormat(null);
            void runExport(f);
          }}
          onCancel={() => setPendingFormat(null)}
        />
      )}

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {visibleFormats.map((fmt) => {
          const busy = exportingId === fmt.id;
          return (
            <li key={fmt.id}>
              <button
                type="button"
                disabled={busy || exportingId !== null}
                onClick={() => handleExportClick(fmt)}
                className="w-full text-left flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
                aria-busy={busy}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {fmt.label}
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                      .{fmt.ext}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {fmt.description}
                  </p>
                </div>
                {busy && (
                  <svg
                    className="motion-safe:animate-spin h-4 w-4 text-blue-600 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        All exports are generated locally — no data leaves your device.
      </p>
    </section>
  );
}
