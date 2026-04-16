import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useEditorStore } from "./store/editor-store";
import { usePIIStore } from "./store/pii-store";
import { getAllSessions, getStepsBySession } from "@/storage/ephemeral-db";
import { getAllGlobalLedgerEntries } from "@/storage/ephemeral-db";
import type { CaptureStep } from "@/types/capture";
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

type RightPanelTab = "pii" | "export" | "import";

function Editor() {
  const { isHydrated, activeSessionId, activeStepIndex, setActiveSession, setHydrated, exportSensitivityAcknowledged } =
    useEditorStore();
  const { loadOperations } = usePIIStore();
  const [sessions, setSessions] = React.useState<Awaited<ReturnType<typeof getAllSessions>>>([]);
  const [steps, setSteps] = React.useState<CaptureStep[]>([]);
  const [showExportWarning, setShowExportWarning] = React.useState(false);
  const [rightTab, setRightTab] = React.useState<RightPanelTab>("pii");

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

  return (
    <>
      <LiveAnnouncer />

      {showExportWarning && !exportSensitivityAcknowledged && (
        <ExportSensitivityWarning
          onConfirm={() => setShowExportWarning(false)}
          onCancel={() => setShowExportWarning(false)}
        />
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-48 lg:w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">ToyoSnap</span>
            <PurgeMemoryButton />
          </div>

          {/* Session list */}
          <nav aria-label="Sessions">
            {!isHydrated ? (
              <div className="space-y-2">
                <SkeletonStep />
                <SkeletonStep />
                <SkeletonStep />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                heading="No sessions yet"
                description="Start a recording from the extension popup."
              />
            ) : (
              <ul className="space-y-1">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSession(s.id)}
                      className={[
                        "w-full text-left px-2 py-1.5 rounded text-xs truncate",
                        activeSessionId === s.id
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
                      ].join(" ")}
                    >
                      {s.mode} — {new Date(s.startedAt).toLocaleString()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <div className="mt-auto space-y-3">
            <StorageUsage />
            <KeyboardShortcutsHint />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!isHydrated ? (
            <div className="p-6 space-y-3">
              <SkeletonStep />
              <SkeletonStep />
              <SkeletonStep />
            </div>
          ) : !activeSessionId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                heading="No session selected"
                description="Select a session from the sidebar to view it."
              />
            </div>
          ) : (
            <ErrorBoundary name="main-content">
              {/* Timeline strip */}
              <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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

                {/* Right panel */}
                <aside className="w-64 lg:w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                  {/* Tab bar */}
                  <div
                    className="flex border-b border-gray-200 dark:border-gray-700"
                    role="tablist"
                    aria-label="Editor panels"
                  >
                    {(["pii", "export", "import"] as RightPanelTab[]).map((tab) => (
                      <button
                        key={tab}
                        role="tab"
                        type="button"
                        id={`tab-${tab}`}
                        aria-selected={rightTab === tab}
                        aria-controls={`panel-${tab}`}
                        onClick={() => setRightTab(tab)}
                        className={[
                          "flex-1 py-2 text-xs font-medium capitalize transition-colors duration-150 cursor-pointer",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
                          rightTab === tab
                            ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                        ].join(" ")}
                      >
                        {tab === "pii" ? "Redact" : tab === "export" ? "Export" : "Import"}
                      </button>
                    ))}
                  </div>

                  {/* Tab panels — each linked to its tab via id + aria-labelledby */}
                  <div className="flex-1 overflow-auto p-4">
                    <div
                      id="panel-pii"
                      role="tabpanel"
                      aria-labelledby="tab-pii"
                      hidden={rightTab !== "pii"}
                    >
                      <PIICanvas
                        step={steps.find((s) => s.stepIndex === activeStepIndex) ?? steps[0] ?? null}
                      />
                    </div>
                    <div
                      id="panel-export"
                      role="tabpanel"
                      aria-labelledby="tab-export"
                      hidden={rightTab !== "export"}
                    >
                      <ExportPanel />
                    </div>
                    <div
                      id="panel-import"
                      role="tabpanel"
                      aria-labelledby="tab-import"
                      hidden={rightTab !== "import"}
                    >
                      <BulkImportDropzone
                        sessionId={activeSessionId}
                        onImported={() => {
                          void getStepsBySession(activeSessionId).then(setSteps);
                        }}
                      />
                    </div>
                  </div>
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
