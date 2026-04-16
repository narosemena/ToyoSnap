import React, { useEffect, useRef, useState } from "react";
import type { CaptureStep } from "@/types/capture";
import { getBlob, getStep } from "@/storage/ephemeral-db";
import rrwebPlayer, { type RRwebPlayerOptions } from "rrweb-player";
import "rrweb-player/dist/style.css";

interface StepViewerProps {
  step: CaptureStep | null;
}

function useObjectUrl(buffer: ArrayBuffer | null, mimeType: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!buffer) {
      setUrl(null);
      return;
    }
    const blob = new Blob([buffer], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [buffer, mimeType]);

  return url;
}

function RrwebViewer({ step }: { step: CaptureStep }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !step.rrwebEvents?.length) return;

    playerRef.current = new rrwebPlayer({
      target: containerRef.current,
      props: {
        events: step.rrwebEvents as RRwebPlayerOptions["props"]["events"],
        width: 800,
        height: 500,
        autoPlay: false,
      },
    });

    return () => {
      if (playerRef.current) {
        (playerRef.current as unknown as { $destroy(): void }).$destroy();
        playerRef.current = null;
      }
    };
  }, [step.sessionId, step.stepIndex, step.rrwebEvents]);

  if (!step.rrwebEvents?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
        No recording events for this step.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}

function BlobViewer({ blobId, mimeType, tag }: { blobId: string; mimeType: string; tag: "img" | "video" }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const url = useObjectUrl(buffer, mimeType);

  useEffect(() => {
    setLoading(true);
    void getBlob(blobId).then((buf) => {
      setBuffer(buf ?? null);
      setLoading(false);
    });
  }, [blobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading…
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-500">
        Failed to load asset.
      </div>
    );
  }

  if (tag === "video") {
    return (
      <video
        src={url}
        controls
        className="w-full rounded"
        aria-label="Captured video recording"
      />
    );
  }

  return (
    <img
      src={url}
      alt={`Captured screenshot`}
      className="w-full rounded object-contain max-h-[600px]"
    />
  );
}

export function StepViewer({ step }: StepViewerProps) {
  // getStepsBySession returns steps with rrwebEvents: null (encrypted separately).
  // Load the full step with decrypted events whenever the selection changes.
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
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
        Select a step to preview.
      </div>
    );
  }

  if (loading || !fullStep) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-pulse">
        Loading step…
      </div>
    );
  }

  // Determine mode from step content
  const hasRrweb = Boolean(fullStep.rrwebEvents?.length);
  const hasBlob = Boolean(fullStep.blobId);

  // video mode: blob with no actionStep and no rrweb events (long recording)
  // image-chain / svg: blob with actionStep
  const isVideo = hasBlob && !hasRrweb && !fullStep.actionStep;

  return (
    <section aria-label={`Step ${fullStep.stepIndex} preview`} className="w-full">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          Step {fullStep.stepIndex}
        </span>
        {fullStep.pageTitle && <span>—</span>}
        {fullStep.pageTitle && <span className="truncate">{fullStep.pageTitle}</span>}
      </div>

      {hasRrweb && <RrwebViewer step={fullStep} />}

      {!hasRrweb && hasBlob && fullStep.blobId && (
        <BlobViewer
          blobId={fullStep.blobId}
          mimeType={isVideo ? "video/webm" : "image/png"}
          tag={isVideo ? "video" : "img"}
        />
      )}

      {!hasRrweb && !hasBlob && (
        <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
          No preview available for this step.
        </div>
      )}
    </section>
  );
}
