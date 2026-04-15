import React, { useState } from "react";
import { useEditorStore } from "@/editor/store/editor-store";
import { ExportSensitivityWarning } from "./ExportSensitivityWarning";
import { exportDocx } from "@/export-engine/docx-exporter";
import { exportPptx } from "@/export-engine/pptx-exporter";
import { exportPngZip } from "@/export-engine/png-zip-exporter";
import { exportHtmlReplay } from "@/export-engine/html-replay-exporter";
import { exportSvgZip } from "@/export-engine/svg-zip-exporter";
import { exportMarkdown } from "@/export-engine/md-exporter";
import { exportVideo } from "@/export-engine/video-exporter";
import { exportActionLog } from "@/export-engine/action-log-exporter";
import { exportMCP } from "@/export-engine/mcp-exporter";

interface ExportFormat {
  id: string;
  label: string;
  description: string;
  ext: string;
  mimeType: string;
  run: (sessionId: string) => Promise<Blob>;
}

const FORMATS: ExportFormat[] = [
  { id: "docx",    label: "Word Document",    description: "Annotated steps with screenshots",     ext: "docx",  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", run: exportDocx },
  { id: "pptx",    label: "PowerPoint",       description: "One slide per step",                   ext: "pptx",  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", run: exportPptx },
  { id: "html",    label: "HTML Replay",      description: "Self-contained rrweb playback file",   ext: "html",  mimeType: "text/html",                   run: exportHtmlReplay },
  { id: "png",     label: "PNG Screenshots",  description: "ZIP archive of step images",           ext: "zip",   mimeType: "application/zip",             run: exportPngZip },
  { id: "svg",     label: "SVG Layers",       description: "ZIP of layered SVG files per step",    ext: "zip",   mimeType: "application/zip",             run: exportSvgZip },
  { id: "md",      label: "Markdown",         description: "Step-by-step markdown document",       ext: "md",    mimeType: "text/markdown",               run: exportMarkdown },
  { id: "video",   label: "Video",            description: "WebM screen recording",                ext: "webm",  mimeType: "video/webm",                  run: exportVideo },
  { id: "log",     label: "Action Log",       description: "JSON log of all captured interactions",ext: "json",  mimeType: "application/json",            run: exportActionLog },
  { id: "mcp",     label: "MCP Package",      description: "Machine-consumable workflow package",  ext: "json",  mimeType: "application/json",            run: exportMCP },
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

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        No session selected.
      </div>
    );
  }

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

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FORMATS.map((fmt) => {
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
    </section>
  );
}
