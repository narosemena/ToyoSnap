import React, { useEffect, useRef, useState } from "react";
import type { CaptureStep } from "@/types/capture";
import type { LedgerEntry } from "@/types/ledger";
import { getBlob, getStep, updateStepPageTitle } from "@/storage/ephemeral-db";
import { useEditorStore } from "@/editor/store/editor-store";
import { usePIIStore } from "@/editor/store/pii-store";
import { ScanOverlay } from './ScanOverlay';
import rrwebPlayer, { type RRwebPlayerOptions } from "rrweb-player";
import "rrweb-player/dist/style.css";

interface StepViewerProps {
  step: CaptureStep | null;
  onStepUpdated?: (step: CaptureStep) => void;
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

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

function ImageViewer({ blobId, mimeType, step }: { blobId: string; mimeType: string; step: CaptureStep }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const url = useObjectUrl(buffer, mimeType);
  const activeTool = useEditorStore((s) => s.activeTool);
  const { activeSessionId, activeStepIndex, blurSettings, redactSettings } = useEditorStore();
  const { applyOperation, appliedOperations } = usePIIStore();

  useEffect(() => {
    setLoading(true);
    void getBlob(blobId).then((buf) => { setBuffer(buf ?? null); setLoading(false); });
  }, [blobId]);

  // Only show region ops belonging to this specific step
  const regionOps = appliedOperations.filter(
    (op) => op.region && (op.stepIndex == null || op.stepIndex === step.stepIndex)
  );

  function getRelPos(e: React.MouseEvent): { x: number; y: number } | null {
    const el = containerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
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

    if (w < 0.005 && h < 0.005) { setDragStart(null); setDragCurrent(null); return; }

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      operationType: activeTool,
      rrwebId: null,
      elementSelector: "",
      region: { x, y, w: Math.max(w, 0.01), h: Math.max(h, 0.01) },
      stepIndex: step.stepIndex,
      blurRadius: activeTool === "blur" ? (blurSettings?.radius ?? 8) : null,
      redactColor: activeTool === "redact" ? (redactSettings?.color ?? "#000000") : null,
      applyGlobally: false,
      replacementText: activeTool === "redact" ? (redactSettings?.label ?? "[REDACTED]") : "",
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

  // Reset zoom when the image changes
  useEffect(() => { setZoom(1); }, [blobId]);

  const isSvg = mimeType === "image/svg+xml";

  // Parse SVG viewBox dimensions to compute a CSS aspect-ratio for the <object> wrapper.
  // <object> collapses to zero height without explicit dimensions; aspect-ratio fixes this.
  const svgAspectRatio = React.useMemo(() => {
    if (!isSvg || !buffer) return null;
    const text = new TextDecoder().decode(new Uint8Array(buffer).subarray(0, 2000));
    // viewBox="minX minY width height"
    const vb = text.match(/viewBox=["'][^"']*?[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)["']/);
    if (vb) return `${vb[1]} / ${vb[2]}`;
    const w = text.match(/\bwidth=["']([\d.]+)["']/);
    const h = text.match(/\bheight=["']([\d.]+)["']/);
    if (w && h) return `${w[1]} / ${h[1]}`;
    return "16 / 9";
  }, [isSvg, buffer]);

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
    <div className="flex flex-col gap-2">
      {/* Zoom controls — only for pixel recordings */}
      {!isSvg && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2))))}
            disabled={zoom <= ZOOM_MIN}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors text-base leading-none cursor-pointer disabled:cursor-not-allowed"
            aria-label="Zoom out"
            title="Zoom out"
          >−</button>
          <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2))))}
            disabled={zoom >= ZOOM_MAX}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors text-base leading-none cursor-pointer disabled:cursor-not-allowed"
            aria-label="Zoom in"
            title="Zoom in"
          >+</button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Scroll viewport — only activates when zoomed */}
      <div className={zoom > 1 ? "overflow-auto rounded" : ""}>
        <div
          ref={containerRef}
          className="relative select-none"
          style={{
            width: zoom !== 1 ? `${zoom * 100}%` : "100%",
            cursor: !isSvg && activeTool ? "crosshair" : "default",
          }}
          onMouseDown={!isSvg ? onMouseDown : undefined}
          onMouseMove={!isSvg ? onMouseMove : undefined}
          onMouseUp={!isSvg ? onMouseUp : undefined}
          onMouseLeave={!isSvg ? () => { setDragStart(null); setDragCurrent(null); } : undefined}
        >
          {isSvg ? (
            /* <object> loads SVG in a browsing context, allowing external <image> references
               (logos, icons). <img> sandboxes SVG and silently blocks those resources. */
            <div style={{ aspectRatio: svgAspectRatio ?? "16 / 9" }} className="w-full">
              <object
                data={url ?? undefined}
                type="image/svg+xml"
                className="w-full h-full rounded block"
                aria-label="Captured SVG recording"
              />
            </div>
          ) : (
            <img
              src={url}
              alt="Captured screenshot"
              className="w-full h-auto rounded block"
              draggable={false}
            />
          )}
          {/* Region overlays — scoped to this step only, pixel recordings only */}
          {!isSvg && (regionOps.length > 0 || liveRect) && (
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
                        : op.redactColor
                          ? `${op.redactColor}dd`
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
                  fill={activeTool === "blur" ? "rgba(59,130,246,0.25)" : "rgba(0,0,0,0.45)"}
                  stroke={activeTool === "blur" ? "rgb(59,130,246)" : "rgb(239,68,68)"}
                  strokeWidth="0.003"
                  strokeDasharray="0.012 0.006"
                />
              )}
            </svg>
          )}
          {!isSvg && activeTool && !dragStart && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg select-none pointer-events-none whitespace-nowrap">
              Drag to {activeTool === "blur" ? "blur" : "redact"} a region
            </div>
          )}
        </div>
      </div>
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

// ——— SvgViewer ————————————————————————————————————————————————————————————

function SvgViewer({ blobId, step }: { blobId: string; step: CaptureStep }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedSvgSelectors, setSelectedSvgSelectors } = useEditorStore();
  const { appliedOperations, applyOperation } = usePIIStore();
  const [inlineEdit, setInlineEdit] = useState<{ selector: string, text: string, rect: DOMRect } | null>(null);
  const [_updateTick, setUpdateTick] = useState(0);

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    void getBlob(blobId).then((buf) => {
      if (buf) {
        const text = new TextDecoder().decode(new Uint8Array(buf));
        setSvgContent(text);
      } else {
        setSvgContent(null);
      }
      setLoading(false);
    });
  }, [blobId]);

  useEffect(() => {
    const handleResize = () => setUpdateTick(t => t + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update layout when operations change (forces re-eval of bounding boxes)
  useEffect(() => {
    setUpdateTick(t => t + 1);
  }, [appliedOperations]);

  function getRelPos(e: React.MouseEvent) {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseDownCapture(e: React.MouseEvent<HTMLDivElement>) {
    // Intercept clicks to prevent links/buttons from triggering navigation or actions
    e.preventDefault();
    if (inlineEdit) return;
    const pos = getRelPos(e);
    if (pos) setDragStart(pos);
  }

  function handleMouseMoveCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const pos = getRelPos(e);
    if (pos) setDragCurrent(pos);
  }

  function handleMouseUpCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const end = getRelPos(e) ?? dragStart;
    
    const x = Math.min(dragStart.x, end.x);
    const y = Math.min(dragStart.y, end.y);
    const w = Math.abs(end.x - dragStart.x);
    const h = Math.abs(end.y - dragStart.y);

    setDragStart(null);
    setDragCurrent(null);

    // If it's just a click (or tiny movement)
    if (w < 2 && h < 2) {
      const target = e.target as Element;
      if (!target || target === containerRef.current || target.tagName.toLowerCase() === "svg" || target.tagName.toLowerCase() === "g") {
        setSelectedSvgSelectors([]);
        return;
      }
      const selector = getCssSelector(target);
      setSelectedSvgSelectors([selector]);
      return;
    }

    // It's a drag selection
    if (!containerRef.current) return;
    const contRect = containerRef.current.getBoundingClientRect();
    const dragClient = {
       left: contRect.left + x,
       top: contRect.top + y,
       right: contRect.left + x + w,
       bottom: contRect.top + y + h
    };

    const allElements = containerRef.current.querySelectorAll("*");
    const newSelectors: string[] = [];
    
    // Select elements intersecting the drag rectangle
    for (let i = 0; i < allElements.length; i++) {
       const el = allElements[i];
       const tag = el.tagName.toLowerCase();
       // Skip structural tags
       if (tag === "svg" || tag === "g" || tag === "div" || tag === "style" || tag === "defs") continue;
       
       const rect = el.getBoundingClientRect();
       if (rect.width === 0 || rect.height === 0) continue;

       // Intersection test
       if (
         rect.left <= dragClient.right &&
         rect.right >= dragClient.left &&
         rect.top <= dragClient.bottom &&
         rect.bottom >= dragClient.top
       ) {
         newSelectors.push(getCssSelector(el));
       }
    }
    
    setSelectedSvgSelectors(newSelectors);
  }

  function handleDoubleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const target = e.target as Element;
    if (target && (target.tagName.toLowerCase() === "text" || target.tagName.toLowerCase() === "tspan")) {
      const selector = getCssSelector(target);
      setSelectedSvgSelectors([selector]);
      setInlineEdit({
        selector,
        text: target.textContent || "",
        rect: target.getBoundingClientRect(),
      });
    }
  }

  async function commitInlineEdit(newText: string) {
    if (!inlineEdit || !step.sessionId) return;
    if (newText.trim() && newText !== inlineEdit.text) {
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        operationType: "redact",
        rrwebId: null,
        elementSelector: inlineEdit.selector,
        applyGlobally: false,
        replacementText: newText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await applyOperation(entry, "local", step.sessionId, String(step.stepIndex));
    }
    setInlineEdit(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading SVG…
      </div>
    );
  }
  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        Failed to load SVG asset.
      </div>
    );
  }

  const containerRect = containerRef.current?.getBoundingClientRect();
  const selectedRects: DOMRect[] = [];
  
  if (selectedSvgSelectors && selectedSvgSelectors.length > 0 && containerRef.current) {
    selectedSvgSelectors.forEach(sel => {
      try {
        const el = containerRef.current?.querySelector(sel);
        if (el) selectedRects.push(el.getBoundingClientRect());
      } catch { /* invalid selector — skip */ }
    });
  }

  const stepOps = appliedOperations.filter(op => op.stepIndex == null || op.stepIndex === step.stepIndex);

  const liveRect =
    dragStart && dragCurrent
      ? {
          x: Math.min(dragStart.x, dragCurrent.x),
          y: Math.min(dragStart.y, dragCurrent.y),
          w: Math.abs(dragCurrent.x - dragStart.x),
          h: Math.abs(dragCurrent.y - dragStart.y),
        }
      : null;

  return (
    <div 
      className="relative w-full rounded overflow-hidden select-none group" 
      ref={containerRef} 
      onMouseDownCapture={handleMouseDownCapture}
      onMouseMoveCapture={handleMouseMoveCapture}
      onMouseUpCapture={handleMouseUpCapture}
      onClickCapture={(e) => e.preventDefault()}
      onDoubleClickCapture={handleDoubleClickCapture}
      onMouseLeave={() => { setDragStart(null); setDragCurrent(null); }}
    >
      <div className="w-full h-auto pointer-events-auto" dangerouslySetInnerHTML={{ __html: svgContent }} />

      {containerRect && stepOps.map(op => {
        if (!op.elementSelector) return null;
        try {
          const el = containerRef.current?.querySelector(op.elementSelector);
          if (!el) return null;
          
          if (op.operationType === "redact" && op.replacementText) {
             if (el.tagName.toLowerCase() === "text" || el.tagName.toLowerCase() === "tspan") {
                 el.textContent = op.replacementText;
                 return null;
             }
          }

          const rect = el.getBoundingClientRect();
          const style: React.CSSProperties = {
            position: "absolute",
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
            pointerEvents: "none",
            borderRadius: "4px",
          };

          if (op.operationType === "blur") {
             style.backdropFilter = `blur(${op.blurRadius || 8}px)`;
             style.backgroundColor = "rgba(59,130,246,0.1)";
          } else if (op.operationType === "pixelate") {
             // Use high blur as fallback for pixelate overlay
             style.backdropFilter = `blur(${op.pixelCellSize || 8}px)`;
          } else if (op.operationType === "redact") {
             style.backgroundColor = op.redactColor || "#000";
          }

          return <div key={op.id} style={style} />;
        } catch { return null; }
      })}

      {containerRect && selectedRects.map((rect, i) => (
        <div
          key={i}
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded transition-all duration-75"
          style={{
            left: rect.left - containerRect.left - 2,
            top: rect.top - containerRect.top - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
        />
      ))}

      {liveRect && (
        <div
          className="absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none rounded"
          style={{
            left: liveRect.x,
            top: liveRect.y,
            width: liveRect.w,
            height: liveRect.h,
          }}
        />
      )}

      {inlineEdit && containerRect && (
        <input
          autoFocus
          type="text"
          defaultValue={inlineEdit.text}
          onBlur={(e) => void commitInlineEdit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setInlineEdit(null); }}
          className="absolute z-20 px-1 border-2 border-blue-500 bg-white text-black text-sm outline-none shadow-lg rounded pointer-events-auto"
          style={{
            left: inlineEdit.rect.left - containerRect.left - 2,
            top: inlineEdit.rect.top - containerRect.top - 2,
            minWidth: Math.max(inlineEdit.rect.width, 150) + 4,
            height: Math.max(inlineEdit.rect.height, 28) + 4,
          }}
        />
      )}
    </div>
  );
}

// ——— StepViewer ——————————————————————————————————————————————————————————

export function StepViewer({ step, onStepUpdated }: StepViewerProps) {
  const [fullStep, setFullStep] = useState<CaptureStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);

  const scanFindings = useEditorStore((s) => s.scanFindings);
  const setScanFindings = useEditorStore((s) => s.setScanFindings);
  const activeTool = useEditorStore((s) => s.activeTool);
  const { applyOperation } = usePIIStore();
  const activeSessionId = useEditorStore((s) => s.activeSessionId);
  const activeStepIndex = useEditorStore((s) => s.activeStepIndex);

  async function handleApplyFindings(
    approved: import('@/types/ai').Finding[],
    tool: import('@/types/ledger').PIIOperationType,
  ) {
    if (!activeSessionId) return;
    const stepId = String(activeStepIndex);
    for (const f of approved) {
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        operationType: tool,
        rrwebId: null,
        elementSelector: '',
        region: f.region,
        blurRadius: tool === 'blur' ? 8 : null,
        pixelCellSize: tool === 'pixelate' ? 8 : null,
        redactColor: tool === 'redact' ? '#000000' : null,
        applyGlobally: false,
        replacementText: '[REDACTED]',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await applyOperation(entry, 'local', activeSessionId, stepId);
    }
    setScanFindings(null);
  }

  useEffect(() => {
    if (!step) { setFullStep(null); return; }
    setLoading(true);
    void getStep(step.sessionId, step.stepIndex).then((s) => {
      setFullStep(s ?? step);
      setLoading(false);
    });
  }, [step?.sessionId, step?.stepIndex]);

  function startEditingLabel() {
    if (!fullStep) return;
    setLabelDraft(fullStep.pageTitle ?? "");
    setEditingLabel(true);
    setTimeout(() => labelInputRef.current?.select(), 0);
  }

  async function commitLabel() {
    if (!fullStep) return;
    setEditingLabel(false);
    const trimmed = labelDraft.trim();
    if (trimmed === fullStep.pageTitle) return;
    await updateStepPageTitle(fullStep.sessionId, fullStep.stepIndex, trimmed);
    const updated = { ...fullStep, pageTitle: trimmed };
    setFullStep(updated);
    onStepUpdated?.(updated);
  }

  function onLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void commitLabel();
    if (e.key === "Escape") { setLabelDraft(fullStep?.pageTitle ?? ""); setEditingLabel(false); }
  }

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
  // Use explicit mimeType when available; fall back to legacy heuristic for
  // steps recorded before mimeType was added to the schema.
  const isVideo = hasBlob && !hasRrweb &&
    (fullStep.mimeType ? fullStep.mimeType === "video/webm" : !fullStep.actionStep);

  return (
    <section
      aria-label={`Step ${fullStep.stepIndex} preview`}
      className="flex flex-col h-full min-h-0"
    >
      <div className="mb-3 shrink-0 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0">
        <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0">
          Step {fullStep.stepIndex}
        </span>
        <span className="shrink-0">—</span>
        {editingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => void commitLabel()}
            onKeyDown={onLabelKeyDown}
            className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label="Edit step label"
          />
        ) : (
          <button
            type="button"
            onClick={startEditingLabel}
            className="flex-1 min-w-0 text-left truncate hover:text-gray-900 dark:hover:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 rounded cursor-text"
            title="Click to edit label"
          >
            {fullStep.pageTitle || <span className="italic text-gray-400 dark:text-gray-500">Untitled</span>}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {hasRrweb && <RrwebViewer step={fullStep} />}
        {!hasRrweb && hasBlob && fullStep.blobId && (
          isVideo
            ? <VideoViewer blobId={fullStep.blobId} />
            : fullStep.mimeType === "image/svg+xml"
              ? <SvgViewer blobId={fullStep.blobId} step={fullStep} />
              : (
                <div className="relative w-full">
                  <ImageViewer
                    blobId={fullStep.blobId}
                    mimeType={fullStep.mimeType ?? "image/png"}
                    step={fullStep}
                  />
                  {scanFindings && scanFindings.length > 0 && (
                    <ScanOverlay
                      findings={scanFindings}
                      activeTool={activeTool}
                      onApply={(approved, tool) => void handleApplyFindings(approved, tool)}
                      onDismiss={() => setScanFindings(null)}
                    />
                  )}
                </div>
              )
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
