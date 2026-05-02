import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/editor/store/editor-store";
import { ExportSensitivityWarning } from "./ExportSensitivityWarning";
import { ExportProgressModal } from "./ExportProgressModal";
import { exportPngZip } from "@/export-engine/png-zip-exporter";
import { exportJpegZip } from "@/export-engine/jpeg-zip-exporter";
import { exportSvgZip } from "@/export-engine/svg-zip-exporter";
import { getSession } from "@/storage/ephemeral-db";
import type { CaptureMode, CaptureSession } from "@/types/capture";

interface ExportFormat {
  id: string;
  label: string;
  description: string;
  ext: string;
  run: (sessionId: string) => Promise<Blob>;
  onlyForMode?: CaptureMode;
  /** If set, only show for image-chain when imageFormat matches */
  onlyForImageFormat?: "png" | "jpeg";
  recommended?: boolean;
}

const FORMATS: ExportFormat[] = [
  {
    id: "png",
    label: "PNG Screenshots",
    description: "ZIP of lossless PNG images with PII overlays baked in",
    ext: "zip",
    run: exportPngZip,
    onlyForMode: "image-chain",
    onlyForImageFormat: "png",
    recommended: true,
  },
  {
    id: "jpeg",
    label: "JPEG Screenshots",
    description: "ZIP of compressed JPEG images with PII overlays baked in",
    ext: "zip",
    run: exportJpegZip,
    onlyForMode: "image-chain",
    onlyForImageFormat: "jpeg",
    recommended: true,
  },
  {
    id: "svg",
    label: "SVG Layers",
    description: "ZIP of layered SVG files with PII overlays injected",
    ext: "zip",
    run: exportSvgZip,
    onlyForMode: "svg",
    recommended: true,
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

type ExportPhase = "idle" | "warning" | "progress" | "done";

export function ExportPanel() {
  const { activeSessionId, exportSensitivityAcknowledged, acknowledgeExportSensitivity } = useEditorStore();
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [exportPercent, setExportPercent] = useState(0);
  const [exportFilename, setExportFilename] = useState("");
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CaptureSession | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) { setSession(null); return; }
    void getSession(activeSessionId).then((s) => setSession(s ?? null));
  }, [activeSessionId]);

  async function runExport(format: ExportFormat) {
    if (!activeSessionId) return;
    setExportPhase("progress");
    setExportPercent(0);
    setError(null);

    intervalRef.current = setInterval(() => {
      setExportPercent((p) => (p < 85 ? p + Math.floor(Math.random() * 12) + 3 : p));
    }, 180);

    try {
      const blob = await format.run(activeSessionId);
      clearInterval(intervalRef.current!);
      setExportPercent(100);
      const ts = new Date().toISOString().slice(0, 10);
      const filename = `toyosnap-${activeSessionId.slice(0, 8)}-${ts}.${format.ext}`;
      setExportFilename(filename);
      downloadBlob(blob, filename);
      timeoutRef.current = setTimeout(() => setExportPhase("done"), 300);
    } catch (err) {
      clearInterval(intervalRef.current!);
      setExportPhase("idle");
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleExportClick(format: ExportFormat) {
    setActiveFormat(format);
    if (!exportSensitivityAcknowledged) {
      setExportPhase("warning");
    } else {
      void runExport(format);
    }
  }

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        No session selected.
      </div>
    );
  }

  const visibleFormats = FORMATS.filter((fmt) => {
    if (fmt.onlyForMode && fmt.onlyForMode !== session?.mode) return false;
    if (fmt.onlyForImageFormat && fmt.onlyForImageFormat !== (session?.imageFormat ?? "png")) return false;
    return true;
  });

  return (
    <>
      {exportPhase === "warning" && activeFormat && (
        <ExportSensitivityWarning
          onConfirm={() => {
            acknowledgeExportSensitivity();
            setExportPhase("idle");
            void runExport(activeFormat);
          }}
          onCancel={() => setExportPhase("idle")}
        />
      )}

      {(exportPhase === "progress" || exportPhase === "done") && (
        <ExportProgressModal
          phase={exportPhase}
          percent={exportPercent}
          filename={exportFilename}
          onDone={() => setExportPhase("idle")}
          onExportAnother={() => setExportPhase("idle")}
        />
      )}

      <section aria-label="Export options">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <ul className="grid grid-cols-1 gap-2">
          {visibleFormats.map((fmt) => {
            const busy = exportPhase === "progress";
            return (
              <li key={fmt.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleExportClick(fmt)}
                  className="w-full text-left flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
                  aria-busy={busy}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center flex-wrap gap-1.5">
                      {fmt.label}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        .{fmt.ext}
                      </span>
                      {fmt.recommended && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--vs-accent-soft)] text-[var(--vs-accent)]">
                          RECOMMENDED
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          All exports are generated locally — no data leaves your device.
        </p>
      </section>
    </>
  );
}
