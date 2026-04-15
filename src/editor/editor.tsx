import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useEditorStore } from "./store/editor-store";
import { usePIIStore } from "./store/pii-store";
import { getAllSessions } from "@/storage/ephemeral-db";
import { getAllGlobalLedgerEntries } from "@/storage/ephemeral-db";
import { LiveAnnouncer } from "./components/LiveAnnouncer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SkeletonStep } from "./components/SkeletonStep";
import { EmptyState } from "./components/EmptyState";
import { PurgeMemoryButton } from "./components/PurgeMemoryButton";
import { KeyboardShortcutsHint } from "./components/KeyboardShortcutsHint";
import { ExportSensitivityWarning } from "./components/export/ExportSensitivityWarning";
import "../styles/globals.css";

function Editor() {
  const { isHydrated, activeSessionId, setActiveSession, setHydrated, exportSensitivityAcknowledged } =
    useEditorStore();
  const { loadOperations } = usePIIStore();
  const [sessions, setSessions] = React.useState<Awaited<ReturnType<typeof getAllSessions>>>([]);
  const [showExportWarning, setShowExportWarning] = React.useState(false);

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
        <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-4">
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

          <div className="mt-auto">
            <KeyboardShortcutsHint />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {!isHydrated ? (
            <div className="space-y-3">
              <SkeletonStep />
              <SkeletonStep />
              <SkeletonStep />
            </div>
          ) : !activeSessionId ? (
            <EmptyState
              heading="No session selected"
              description="Select a session from the sidebar to view it."
            />
          ) : (
            <ErrorBoundary name="main-content">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Session: <code className="font-mono">{activeSessionId}</code>
              </p>
            </ErrorBoundary>
          )}
        </main>
      </div>
    </>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<Editor />);
