import React, { useEffect, useRef, useState } from "react";
import type { CaptureStep } from "@/types/capture";
import type { LedgerEntry } from "@/types/ledger";
import { getBlob, getStep } from "@/storage/ephemeral-db";
import { useEditorStore } from "@/editor/store/editor-store";
import { usePIIStore } from "@/editor/store/pii-store";
import rrwebPlayer, { type RRwebPlayerOptions } from "rrweb-player";
import "rrweb-player/dist/style.css";

interface StepViewerProps {
  step: CaptureStep | null;
}

// ——— CSS selector generator for elements inside the rrweb replay iframe ———

function getCssSelector(el: Element, depth = 0): string {
  if (depth > 4) return el.tagName.toLowerCase();

  // Prefer id (skip rrweb-generated or numeric ids)
  if (el.id && !/^(\d|rr-)/.test(el.id)) return `#${CSS.escape(el.id)}`;

  const tag = el.tagName.toLowerCase();

  // name attribute (form fields)
  const name = (el as HTMLElement).getAttribute?.("name");
  if (name) return `${tag}[name="${CSS.escape(name)}"]`;

  // Non-rrweb data attributes
  const dataAttr = Array.from(el.attributes).find(
    (a) => a.name.startsWith("data-") && !a.name.startsWith("data-rr") && a.value
  );
  if (dataAttr) return `[${dataAttr.name}="${CSS.escape(dataAttr.value)}"]`;

  // Meaningful classes (skip very short/utility ones and rrweb classes)
  const classes = Array.from(el.classList)
    .filter((c) => c.length > 2 && !c.startsWith("rr-"))
    .slice(0, 2);
  if (classes.length) return `${tag}.${classes.map((c) => CSS.escape(c)).join(".")}`;

  // nth-child fallback
  const parent = el.parentElement;
  if (!parent || parent === el.ownerDocument?.body) return tag;
  const idx = Array.from(parent.children).indexOf(el) + 1;
  return `${getCssSelector(parent, depth + 1)} > ${tag}:nth-child(${idx})`;
}

// ——— Object URL hook ——————————————————————————————————————————————————————

function useObjectUrl(buffer: ArrayBuffer | null, mimeType: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!buffer) { setUrl(null); return; }
    const blob = new Blob([buffer], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [buffer, mimeType]);
  return url;
}

// ——— RrwebViewer ——————————————————————————————————————————————————————————
//
// DOM recording mode. The rrweb player renders into an iframe inside the
// extension page (chrome-extension:// origin). Since both the editor page and
// the iframe share the same extension origin, contentDocument is accessible.
//
// When a tool is active an invisible overlay intercepts clicks. We map the
// click to an element inside the iframe via elementFromPoint, generate a CSS
// selector, and apply it directly to the PII store.
//
// CSS selectors can be applied globally across all steps of the same session
// because rrweb captures the same page DOM. Image/video steps cannot do this.

function RrwebViewer({ step }: { step: CaptureStep }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rrwebTargetRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | null>(null);
  const [playerWidth, setPlayerWidth] = useState(0);

  const activeTool = useEditorStore((s) => s.activeTool);
  const { activeSessionId, activeStepIndex } = useEditorStore();
  const { applyOperation } = usePIIStore();

  // Measure container width so the player fills available horizontal space.
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0) setPlayerWidth(w);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // (Re)create player whenever the step or measured width changes.
  useEffect(() => {
    if (!rrwebTargetRef.current || !step.rrwebEvents?.length || playerWidth === 0) return;

    if (playerRef.current) {
      (playerRef.current as unknown as { $destroy(): void }).$destroy();
      playerRef.current = null;
    }
    rrwebTargetRef.current.innerHTML = "";

    const height = Math.round(playerWidth * 9 / 16);
    playerRef.current = new rrwebPlayer({
      target: rrwebTargetRef.current,
      props: {
        events: step.rrwebEvents as RRwebPlayerOptions["props"]["events"],
        width: playerWidth,
        height,
        autoPlay: false,
      },
    });

    return () => {
      if (playerRef.current) {
        (playerRef.current as unknown as { $destroy(): void }).$destroy();
        playerRef.current = null;
      }
    };
  }, [step.sessionId, step.stepIndex, step.rrwebEvents, playerWidth]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeTool || !activeSessionId) return;
    try {
      const player = playerRef.current as unknown as {
        getReplayer?: () => { iframe?: HTMLIFrameElement };
      };
      const iframe = player?.getReplayer?.()?.iframe;
      if (!iframe?.contentDocument) return;

      const iframeRect = iframe.getBoundingClientRect();
      const x = e.clientX - iframeRect.left;
      const y = e.clientY - iframeRect.top;
      if (x < 0 || y < 0 || x > iframeRect.width || y > iframeRect.height) return;

      const el = iframe.contentDocument.elementFromPoint(x, y);
      if (!el || el.tagName === "HTML" || el.tagName === "BODY") return;

      const selector = getCssSelector(el);
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        operationType: activeTool,
        rrwebId: null,
        elementSelector: selector,
        applyGlobally: false,
        replacementText: activeTool === "redact" ? "[REDACTED]" : "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      void applyOperation(entry, "local", activeSessionId, String(activeStepIndex));
    } catch {
      // iframe access denied — can happen in unusual configurations; silently skip
    }
  }

  if (!step.rrwebEvents?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400">
        No recording events for this step.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div ref={rrwebTargetRef} />
      {activeTool && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Click an element to ${activeTool} it`}
          className="absolute inset-0 z-10 cursor-crosshair focus:outline-none"
          onClick={handleOverlayClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
        >
          <span className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg select-none pointer-events-none whitespace-nowrap">
            Click an element to {activeTool}
          </span>
        </div>
      )}
    </div>
  );
}

// ——— ImageViewer ——————————————————————————————————————————————————————————
//
// Screenshot / SVG capture mode. No DOM structure is available — redaction is
// coordinate-based. The user drags a rectangle over the image while a tool is
// active. The region is stored as {x, y, w, h} in fractional image coordinates
// (0–1) so it scales correctly regardless of display size.
//
// Applied regions render as coloured SVG overlays on top of the image.
// Unlike DOM mode, these cannot be applied globally across steps because each
// step has a different visual layout.

function ImageViewer({ blobId, step }: { blobId: string; step: CaptureStep }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const url = useObjectUrl(buffer, "image/png");
  const activeTool = useEditorStore((s) => s.activeTool);
  const { activeSessionId, activeStepIndex } = useEditorStore();
  const { applyOperation, appliedOperations } = usePIIStore();

  useEffect(() => {
    setLoading(true);
    void getBlob(blobId).then((buf) => { setBuffer(buf ?? null); setLoading(false); });
  }, [blobId]);

  // Show only region-based ops (image mode ops carry a region field)
  const regionOps = appliedOperations.filter((op) => op.region);

  function getRelPos(e: React.MouseEvent): { x: number; y: number } | null {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!activeTool) return;
    e.preventDefault();
    const pos = getRelPos(e);
    if (pos) { setDragStart(pos); setDragCurrent(pos); }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart) return;
    const pos = getRelPos(e);
    if (pos) setDragCurrent(pos);
  }

  async function onMouseUp(e: React.MouseEvent) {
    if (!dragStart || !activeTool || !activeSessionId) {
      setDragStart(null); setDragCurrent(null); return;
    }
    const end = getRelPos(e) ?? dragStart;
    const x = Math.min(dragStart.x, end.x);
    const y = Math.min(dragStart.y, end.y);
    const w = Math.abs(end.x - dragStart.x);
    const h = Math.abs(end.y - dragStart.y);

    // Ignore accidental single clicks with no area
    if (w < 0.005 && h < 0.005) { setDragStart(null); setDragCurrent(null); return; }

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      operationType: activeTool,
      rrwebId: null,
      elementSelector: "",
      region: { x, y, w: Math.max(w, 0.01), h: Math.max(h, 0.01) },
      applyGlobally: false,
      replacementText: activeTool === "redact" ? "[REDACTED]" : "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await applyOperation(entry, "local", activeSessionId, String(activeStepIndex));
    setDragStart(null); setDragCurrent(null);
  }

  const liveRect =
    dragStart && dragCurrent
      ? {
          x: Math.min(dragStart.x, dragCurrent.x),
          y: Math.min(dragStart.y, dragCurrent.y),
          w: Math.abs(dragCurrent.x - dragStart.x),
          h: Math.abs(dragCurrent.y - dragStart.y),
        }
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        Failed to load asset.
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ cursor: activeTool ? "crosshair" : "default" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { setDragStart(null); setDragCurrent(null); }}
    >
      <img
        ref={imgRef}
        src={url}
        alt="Captured screenshot"
        className="w-full rounded block"
        draggable={false}
      />
      {/* Redaction overlays */}
      {(regionOps.length > 0 || liveRect) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          {regionOps.map((op) =>
            op.region ? (
              <rect
                key={op.id}
                x={op.region.x}
                y={op.region.y}
                width={op.region.w}
                height={op.region.h}
                fill={
                  op.operationType === "blur"
                    ? "rgba(59,130,246,0.45)"
                    : "rgba(0,0,0,0.88)"
                }
                stroke={
                  op.operationType === "blur" ? "rgb(59,130,246)" : "rgb(239,68,68)"
                }
                strokeWidth="0.004"
              />
            ) : null
          )}
          {liveRect && (
            <rect
              x={liveRect.x}
              y={liveRect.y}
              width={liveRect.w}
              height={liveRect.h}
              fill={
                activeTool === "blur"
                  ? "rgba(59,130,246,0.25)"
                  : "rgba(0,0,0,0.45)"
              }
              stroke={activeTool === "blur" ? "rgb(59,130,246)" : "rgb(239,68,68)"}
              strokeWidth="0.003"
              strokeDasharray="0.012 0.006"
            />
          )}
        </svg>
      )}
      {activeTool && !dragStart && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg select-none pointer-events-none whitespace-nowrap">
          Drag to {activeTool === "blur" ? "blur" : "redact"} a region
        </div>
      )}
    </div>
  );
}

// ——— VideoViewer ——————————————————————————————————————————————————————————

function VideoViewer({ blobId }: { blobId: string }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const url = useObjectUrl(buffer, "video/webm");

  useEffect(() => {
    setLoading(true);
    void getBlob(blobId).then((buf) => { setBuffer(buf ?? null); setLoading(false); });
  }, [blobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        Failed to load asset.
      </div>
    );
  }
  return (
    <video
      src={url}
      controls
      className="w-full rounded"
      aria-label="Captured video recording"
    />
  );
}

// ——— StepViewer ——————————————————————————————————————————————————————————

export function StepViewer({ step }: StepViewerProps) {
  const [fullStep, setFullStep] = useState<CaptureStep | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!step) { setFullStep(null); return; }
    setLoading(true);
    void getStep(step.sessionId, step.stepIndex).then((s) => {
      setFullStep(s ?? step);
      setLoading(false);
    });
  }, [step?.sessionId, step?.stepIndex]);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Select a step to preview.
      </div>
    );
  }

  if (loading || !fullStep) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading step…
      </div>
    );
  }

  const hasRrweb = Boolean(fullStep.rrwebEvents?.length);
  const hasBlob = Boolean(fullStep.blobId);
  const isVideo = hasBlob && !hasRrweb && !fullStep.actionStep;

  return (
    <section
      aria-label={`Step ${fullStep.stepIndex} preview`}
      className="flex flex-col h-full min-h-0"
    >
      <div className="mb-3 shrink-0 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          Step {fullStep.stepIndex}
        </span>
        {fullStep.pageTitle && <span>—</span>}
        {fullStep.pageTitle && (
          <span className="truncate">{fullStep.pageTitle}</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {hasRrweb && <RrwebViewer step={fullStep} />}
        {!hasRrweb && hasBlob && fullStep.blobId && (
          isVideo
            ? <VideoViewer blobId={fullStep.blobId} />
            : <ImageViewer blobId={fullStep.blobId} step={fullStep} />
        )}
        {!hasRrweb && !hasBlob && (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400">
            No preview available for this step.
          </div>
        )}
      </div>
    </section>
  );
}
