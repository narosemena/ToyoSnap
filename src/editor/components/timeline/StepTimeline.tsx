import React, { useRef, useEffect } from "react";
import type { CaptureStep, CaptureMode } from "@/types/capture";
import { useEditorStore } from "@/editor/store/editor-store";
import { OverrideBadge } from "./OverrideBadge";

interface StepTimelineProps {
  steps: CaptureStep[];
  /** stepIndex values that have local PII overrides */
  overriddenSteps?: Set<number>;
}

const MODE_LABELS: Record<CaptureMode, string> = {
  "image-chain": "Image",
  rrweb: "DOM",
  video: "Video",
  svg: "SVG",
};

const MODE_COLORS: Record<CaptureMode, string> = {
  "image-chain": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  rrweb: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  video: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  svg: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

function StepThumbnail({
  step,
  isActive,
  hasOverride,
  onClick,
}: {
  step: CaptureStep;
  isActive: boolean;
  hasOverride: boolean;
  onClick: () => void;
}) {
  const mode: CaptureMode = (step.actionStep ? "rrweb" : step.blobId ? "image-chain" : "rrweb");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Step ${step.stepIndex}: ${step.pageTitle || "Untitled"}`}
      aria-pressed={isActive}
      className={[
        "relative flex-none w-24 rounded-lg border-2 p-1 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
          : "border-transparent bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
      ].join(" ")}
    >
      {/* Thumbnail area */}
      <div className="w-full aspect-video rounded bg-gray-200 dark:bg-gray-700 overflow-hidden mb-1 flex items-center justify-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {step.stepIndex}
        </span>
      </div>

      {/* Page title */}
      <p className="text-xs text-gray-700 dark:text-gray-300 truncate leading-tight">
        {step.pageTitle || "Untitled"}
      </p>

      {/* Badges row */}
      <div className="mt-1 flex flex-wrap gap-0.5 items-center">
        <span
          className={`inline-block px-1 py-px rounded text-xs font-medium ${MODE_COLORS[mode]}`}
        >
          {MODE_LABELS[mode]}
        </span>
        {hasOverride && <OverrideBadge />}
      </div>
    </button>
  );
}

export function StepTimeline({ steps, overriddenSteps = new Set() }: StepTimelineProps) {
  const { activeStepIndex, setActiveStep } = useEditorStore();
  const activeRef = useRef<HTMLLIElement>(null);

  // Scroll active step into view when it changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeStepIndex]);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
        No steps captured yet.
      </div>
    );
  }

  return (
    <nav aria-label="Capture steps timeline">
      <ol className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {steps.map((step) => {
          const isActive = step.stepIndex === activeStepIndex;
          return (
            <li
              key={step.stepIndex}
              ref={isActive ? activeRef : undefined}
              className="flex-none"
            >
              <StepThumbnail
                step={step}
                isActive={isActive}
                hasOverride={overriddenSteps.has(step.stepIndex)}
                onClick={() => setActiveStep(step.stepIndex)}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
