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
        "w-full min-h-[44px] rounded-lg font-semibold text-sm transition-colors",
        isRecording
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white",
      ].join(" ")}
      // Accessible name updated dynamically per ARIA spec
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
    </button>
  );
}
