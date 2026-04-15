import React, { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/editor/store/editor-store";
import { putBlob, putStep } from "@/storage/ephemeral-db";

interface BulkImportDropzoneProps {
  sessionId: string;
  onImported?: (count: number) => void;
}

type ImportStatus = "idle" | "dragging" | "importing" | "done" | "error";

async function importImageFile(
  file: File,
  sessionId: string,
  stepIndex: number
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const blobId = crypto.randomUUID();
  await putBlob(blobId, buffer);
  await putStep({
    sessionId,
    stepIndex,
    timestamp: file.lastModified || Date.now(),
    url: location.href,
    pageTitle: file.name,
    blobId,
    rrwebEvents: null,
    actionStep: null,
    spotlightSelector: null,
  });
}

export function BulkImportDropzone({ sessionId, onImported }: BulkImportDropzoneProps) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) {
        setStatus("error");
        setMessage("No image files found. Drop PNG, JPG, or WebP images.");
        return;
      }
      setStatus("importing");
      setMessage(`Importing ${images.length} image${images.length > 1 ? "s" : ""}…`);
      try {
        // Sort by name for deterministic step ordering
        images.sort((a, b) => a.name.localeCompare(b.name));
        for (let i = 0; i < images.length; i++) {
          await importImageFile(images[i]!, sessionId, i + 1);
        }
        setStatus("done");
        setMessage(`Imported ${images.length} step${images.length > 1 ? "s" : ""}.`);
        onImported?.(images.length);
      } catch (err) {
        setStatus("error");
        setMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [sessionId, onImported]
  );

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setStatus("dragging");
  }

  function onDragLeave() {
    if (status === "dragging") setStatus("idle");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    void processFiles(files);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    void processFiles(files);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  const borderColor =
    status === "dragging"
      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
      : status === "done"
      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
      : status === "error"
      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";

  return (
    <div
      role="region"
      aria-label="Bulk image import dropzone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${borderColor}`}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={onFileChange}
        aria-label="Select image files to import"
      />

      {status === "importing" ? (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="animate-spin h-6 w-6 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg
            className={`h-8 w-8 ${status === "done" ? "text-green-500" : status === "error" ? "text-red-400" : "text-gray-400"}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {status === "done" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            )}
          </svg>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {status === "done"
              ? "Import complete"
              : status === "error"
              ? "Import failed"
              : "Drop images here or click to select"}
          </p>
          {message && (
            <p className={`text-xs ${status === "error" ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
              {message}
            </p>
          )}
          {status === "idle" && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              PNG, JPG, WebP — sorted alphabetically into steps
            </p>
          )}
          {(status === "done" || status === "error") && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); setMessage(null); }}
              className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Import more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
