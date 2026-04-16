import React, { useEffect, useRef, useState as useS } from "react";
import { createRoot } from "react-dom/client";
import { useEditorStore } from "./store/editor-store";
import { usePIIStore } from "./store/pii-store";
import { getAllSessions, getStepsBySession, purgeSession } from "@/storage/ephemeral-db";
import { getAllGlobalLedgerEntries } from "@/storage/ephemeral-db";
import type { CaptureSession, CaptureStep } from "@/types/capture";
import { LiveAnnouncer } from "./components/LiveAnnouncer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SkeletonStep } from "./components/SkeletonStep";
import { EmptyState } from "./components/EmptyState";
import { PurgeMemoryButton } from "./components/PurgeMemoryButton";
import { KeyboardShortcutsHint } from "./components/KeyboardShortcutsHint";
import { ExportSensitivityWarning } from "./components/export/ExportSensitivityWarning";
import { StepTimeline } from "./components/timeline/StepTimeline";
import { StepViewer } from "./components/StepViewer";
import { PIICanvas } from "./components/PIICanvas";
import { ExportPanel } from "./components/export/ExportPanel";
import { BulkImportDropzone } from "./components/BulkImportDropzone";
import { StorageUsage } from "./components/StorageUsage";
import "../styles/globals.css";

type RightPanelTab = "pii" | "export";

// ——— Draggable-edge panel resize ——————————————————————————————————————————
// dir "right": handle is on the right edge (left sidebar) — drag right = wider
// dir "left":  handle is on the left  edge (right panel) — drag left  = wider
function usePanelResize(initial: number, min: number, max: number, dir: "right" | "left") {
  const [width, setWidth] = useS(initial);
  const state = useRef({ active: false, startX: 0, startW: 0 });

  function onHandleMouseDown(e: React.MouseEvent) {
    state.current = { active: true, startX: e.clientX, startW: width };
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!state.current.active) return;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const delta = e.clientX - state.current.startX;
      const raw = dir === "right" ? state.current.startW + delta : state.current.startW - delta;
      setWidth(Math.max(min, Math.min(max, raw)));
    }
    function onUp() {
      if (!state.current.active) return;
      state.current.active = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dir, min, max]);

  return { width, onHandleMouseDown };
}

// ——— Chevron icons ————————————————————————————————————————————————————————
function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3L5 8l5 5"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l5 5-5 5"/>
    </svg>
  );
}

function Editor() {
  const { isHydrated, activeSessionId, activeStepIndex, setActiveSession, setHydrated, exportSensitivityAcknowledged } =
    useEditorStore();
  const { loadOperations } = usePIIStore();
  const [sessions, setSessions] = React.useState<CaptureSession[]>([]);
  const [steps, setSteps] = React.useState<CaptureStep[]>([]);
  const [showExportWarning, setShowExportWarning] = React.useState(false);
  const [rightTab, setRightTab] = React.useState<RightPanelTab>("pii");
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const leftPanel = usePanelResize(240, 160, 400, "right");
  const rightPanel = usePanelResize(300, 220, 480, "left");

  // Load steps when active session changes
  useEffect(() => {
    if (!activeSessionId) { setSteps([]); return; }
    void getStepsBySession(activeSessionId).then(setSteps);
  }, [activeSessionId]);

  // Initialization — sequential per plan: editor-store first, then pii-store
  useEffect(() => {
    void (async () => {
      // Step 1: load sessions
      const allSessions = await getAllSessions();
      setSessions(allSessions);

      // Pick the session from URL param or most recent
      const urlParams = new URLSearchParams(location.search);
      const paramId = urlParams.get("session");
      const target = paramId ?? allSessions[allSessions.length - 1]?.id ?? null;
      if (target) setActiveSession(target);

      // Step 2: load ledger for active session
      const ledgerEntries = await getAllGlobalLedgerEntries();
      loadOperations(ledgerEntries);

      // Step 3: mark hydrated — UI renders from this point
      setHydrated(true);
    })();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        usePIIStore.getState().undo();
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        usePIIStore.getState().redo();
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        setShowExportWarning(true);
      }
      if (e.key === "Escape") {
        useEditorStore.getState().setActiveTool(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  async function deleteOne(sessionId: string) {
    await purgeSession(sessionId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    setCheckedIds((prev) => { const n = new Set(prev); n.delete(sessionId); return n; });
    setOpenMenuId(null);
    if (activeSessionId === sessionId) {
      setActiveSession(remaining[remaining.length - 1]?.id ?? null);
    }
  }

  async function deleteSelected() {
    for (const id of checkedIds) await purgeSession(id);
    const remaining = sessions.filter((s) => !checkedIds.has(s.id));
    setSessions(remaining);
    setCheckedIds(new Set());
    if (activeSessionId && checkedIds.has(activeSessionId)) {
      setActiveSession(remaining[remaining.length - 1]?.id ?? null);
    }
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <>
      <LiveAnnouncer />

      {showExportWarning && !exportSensitivityAcknowledged && (
        <ExportSensitivityWarning
          onConfirm={() => setShowExportWarning(false)}
          onCancel={() => setShowExportWarning(false)}
        />
      )}

      <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <aside
          style={{ width: leftCollapsed ? 40 : leftPanel.width }}
          className="shrink-0 flex border-r border-gray-200 dark:border-gray-700 transition-none overflow-hidden"
          aria-label="Sessions sidebar"
        >
          {leftCollapsed ? (
            /* Collapsed strip */
            <div className="w-full flex flex-col items-center pt-3 pb-3 gap-3">
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight />
              </button>
            </div>
          ) : (
            /* Expanded content */
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 gap-3">
              <div className="flex items-center justify-between shrink-0">
                <span className="font-semibold text-sm truncate">ToyoSnap</span>
                <div className="flex items-center gap-1">
                  <PurgeMemoryButton />
                  <button
                    type="button"
                    onClick={() => setLeftCollapsed(true)}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft />
                  </button>
                </div>
              </div>

              <nav aria-label="Sessions" className="flex-1 min-h-0 overflow-y-auto">
                {!isHydrated ? (
                  <div className="space-y-2">
                    <SkeletonStep /><SkeletonStep /><SkeletonStep />
                  </div>
                ) : sessions.length === 0 ? (
                  <EmptyState heading="No sessions yet" description="Start a recording from the extension popup." />
                ) : (
                  <>
                    {checkedIds.size > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <button type="button" onClick={() => void deleteSelected()}
                          className="flex-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          Delete {checkedIds.size}
                        </button>
                        <button type="button" onClick={() => setCheckedIds(new Set())}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1" aria-label="Clear selection">
                          ✕
                        </button>
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {sessions.map((s) => (
                        <li key={s.id} className="group flex items-center gap-1">
                          <input type="checkbox" checked={checkedIds.has(s.id)} onChange={() => toggleCheck(s.id)}
                            className="shrink-0 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            aria-label={`Select session ${new Date(s.startedAt).toLocaleString()}`} />
                          <button type="button" onClick={() => setActiveSession(s.id)}
                            className={["flex-1 min-w-0 text-left px-2 py-1.5 rounded text-xs truncate transition-colors",
                              activeSessionId === s.id ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"].join(" ")}>
                            <span className="block truncate font-medium capitalize">{s.mode}</span>
                            <span className={["block truncate", activeSessionId === s.id ? "text-blue-200" : "text-gray-400 dark:text-gray-500"].join(" ")}>
                              {new Date(s.startedAt).toLocaleString()}
                            </span>
                          </button>
                          <div className="relative shrink-0">
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              aria-label="Session options" aria-haspopup="menu" aria-expanded={openMenuId === s.id}>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                              </svg>
                            </button>
                            {openMenuId === s.id && (
                              <div role="menu" className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                <button role="menuitem" type="button" onClick={() => void deleteOne(s.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </nav>

              <div className="mt-auto space-y-3 shrink-0">
                <StorageUsage />
                <KeyboardShortcutsHint />
              </div>
            </div>
          )}

          {/* Drag handle — right edge of left sidebar */}
          {!leftCollapsed && (
            <div
              onMouseDown={leftPanel.onHandleMouseDown}
              className="w-1 shrink-0 cursor-col-resize self-stretch hover:bg-blue-400 active:bg-blue-500 transition-colors duration-100"
              role="separator" aria-orientation="vertical" aria-label="Resize sidebar"
            />
          )}
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!isHydrated ? (
            <div className="p-6 space-y-3"><SkeletonStep /><SkeletonStep /><SkeletonStep /></div>
          ) : !activeSessionId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState heading="No session selected" description="Select a session from the sidebar to view it." />
            </div>
          ) : (
            <ErrorBoundary name="main-content">
              {/* Timeline strip */}
              <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                <StepTimeline steps={steps} />
              </div>

              {/* Step viewer + right panel */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Center: step preview */}
                <section className="flex-1 flex flex-col overflow-hidden p-4 min-w-0">
                  <StepViewer
                    step={steps.find((s) => s.stepIndex === activeStepIndex) ?? steps[0] ?? null}
                  />
                </section>

                {/* ── Right panel ───────────────────────────────────────── */}
                <aside
                  style={{ width: rightCollapsed ? 40 : rightPanel.width }}
                  className="shrink-0 flex border-l border-gray-200 dark:border-gray-700 transition-none overflow-hidden"
                  aria-label="Tools panel"
                >
                  {/* Drag handle — left edge of right panel */}
                  {!rightCollapsed && (
                    <div
                      onMouseDown={rightPanel.onHandleMouseDown}
                      className="w-1 shrink-0 cursor-col-resize self-stretch hover:bg-blue-400 active:bg-blue-500 transition-colors duration-100"
                      role="separator" aria-orientation="vertical" aria-label="Resize tools panel"
                    />
                  )}

                  {rightCollapsed ? (
                    /* Collapsed strip */
                    <div className="w-full flex flex-col items-center pt-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setRightCollapsed(false)}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Expand tools panel"
                        title="Expand tools panel"
                      >
                        <ChevronLeft />
                      </button>
                    </div>
                  ) : (
                    /* Expanded panel content */
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                      {/* Panel header: tabs + collapse button */}
                      <div className="flex items-stretch border-b border-gray-200 dark:border-gray-700 shrink-0" role="tablist" aria-label="Editor panels">
                        {(["pii", "export"] as RightPanelTab[]).map((tab) => (
                          <button key={tab} role="tab" type="button"
                            id={`tab-${tab}`} aria-selected={rightTab === tab} aria-controls={`panel-${tab}`}
                            onClick={() => setRightTab(tab)}
                            className={["flex-1 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
                              rightTab === tab ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"].join(" ")}>
                            {tab === "pii" ? "Redact" : "Export"}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRightCollapsed(true)}
                          className="px-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l border-gray-200 dark:border-gray-700 shrink-0"
                          aria-label="Collapse tools panel"
                          title="Collapse tools panel"
                        >
                          <ChevronRight />
                        </button>
                      </div>

                      {/* Tab panels */}
                      <div className="flex-1 overflow-auto p-4 min-h-0">
                        <div id="panel-pii" role="tabpanel" aria-labelledby="tab-pii" hidden={rightTab !== "pii"}>
                          <PIICanvas step={steps.find((s) => s.stepIndex === activeStepIndex) ?? steps[0] ?? null} />
                        </div>
                        <div id="panel-export" role="tabpanel" aria-labelledby="tab-export" hidden={rightTab !== "export"}>
                          <ExportPanel />
                        </div>
                      </div>

                      {/* Import — collapsible bottom section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 shrink-0">
                        <button type="button" onClick={() => setImportOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          aria-expanded={importOpen}>
                          <span>Import</span>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
                            className={`transition-transform duration-150 ${importOpen ? "rotate-180" : ""}`}>
                            <path d="M1.5 4.5l6.5 7 6.5-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {importOpen && (
                          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                            <BulkImportDropzone sessionId={activeSessionId}
                              onImported={() => { void getStepsBySession(activeSessionId).then(setSteps); }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </ErrorBoundary>
          )}
        </main>
      </div>
    </>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<Editor />);
