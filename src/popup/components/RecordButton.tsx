import React from "react";

interface Props {
  isRecording: boolean;
  onClick: () => void;
}

export function RecordButton({ isRecording, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      // WCAG 2.5.5: min 44x44px touch target
      className={[
        "w-full min-h-[44px] rounded-lg font-semibold text-sm transition-colors duration-150 cursor-pointer",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        isRecording
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white",
      ].join(" ")}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      <span className="flex items-center justify-center gap-2">
        {isRecording ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <rect x="2" y="2" width="10" height="10" rx="1.5" />
            </svg>
            Stop Recording
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <circle cx="7" cy="7" r="5" />
            </svg>
            Start Recording
          </>
        )}
      </span>
    </button>
  );
}
