import React, { useState } from 'react';
import type { Finding } from '@/types/ai';
import type { PIIOperationType } from '@/types/ledger';

interface Props {
  findings: Finding[];
  activeTool: PIIOperationType | null;
  onApply: (approved: Finding[], tool: PIIOperationType) => void;
  onDismiss: () => void;
}

const PII_COLORS: Record<Finding['piiType'], string> = {
  name: '#f59e0b',
  email: '#ef4444',
  phone: '#8b5cf6',
  address: '#06b6d4',
  face: '#ec4899',
  card: '#f97316',
  credential: '#dc2626',
  id: '#0891b2',
  medical: '#16a34a',
};

export function ScanOverlay({ findings, activeTool, onApply, onDismiss }: Props) {
  const [local, setLocal] = useState<Finding[]>(() => findings.map((f) => ({ ...f })));
  const [showPicker, setShowPicker] = useState(false);
  const approved = local.filter((f) => f.approved);

  function toggle(id: string) {
    setLocal((prev) => prev.map((f) => (f.id === id ? { ...f, approved: !f.approved } : f)));
  }

  function acceptAll() {
    setLocal((prev) => prev.map((f) => ({ ...f, approved: true })));
  }

  function clearAll() {
    setLocal((prev) => prev.map((f) => ({ ...f, approved: false })));
  }

  function doApply(tool: PIIOperationType) {
    setShowPicker(false);
    onApply(approved, tool);
  }

  function handleApplyClick() {
    if (!activeTool) {
      setShowPicker(true);
    } else {
      doApply(activeTool);
    }
  }

  const applyLabel =
    approved.length === 0
      ? 'Apply'
      : `Apply ${approved.length} finding${approved.length !== 1 ? 's' : ''}`;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {local.map((f) => {
        const color = PII_COLORS[f.piiType];
        return (
          <div
            key={f.id}
            className="absolute pointer-events-auto group"
            style={{
              left: `${f.region.x * 100}%`,
              top: `${f.region.y * 100}%`,
              width: `${f.region.w * 100}%`,
              height: `${f.region.h * 100}%`,
              border: `2px solid ${color}`,
              background: `${color}26`,
              opacity: f.approved ? 1 : 0.3,
            }}
          >
            <div
              className="absolute flex items-center gap-1 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ background: color, top: '-22px', left: 0 }}
            >
              {f.label} · {Math.round(f.confidence * 100)}%
              <button
                type="button"
                data-testid={`reject-${f.id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggle(f.id)}
                aria-label={`reject ${f.label}`}
              >
                ✗
              </button>
            </div>
          </div>
        );
      })}

      {/* Toolbar */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-3 pointer-events-auto">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={approved.length === 0}
            onClick={handleApplyClick}
            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applyLabel}
          </button>
        </div>
      </div>

      {/* Tool picker modal */}
      {showPicker && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto">
          <div className="bg-white rounded-xl p-4 shadow-xl space-y-2 w-44">
            <p className="text-sm font-semibold text-gray-800">Choose redaction type</p>
            {(['blur', 'redact', 'pixelate'] as PIIOperationType[]).map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => doApply(tool)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm capitalize hover:bg-gray-100"
              >
                {tool}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
