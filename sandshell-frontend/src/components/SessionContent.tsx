"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import SessionCard from "@/components/SessionCard";
import { useSessionContext } from "@/context/SessionContext";
import type { EditorTab } from "@/types/session";

export default function SessionPage() {
  const { sessionId, status, statusMessage, startSession, endSession } = useSessionContext();
  const isActive = status === "online";

  const [showTerminalView, setShowTerminalView] = useState(false);

  // Which pane is visible inside the main view. Terminal and CodeEditor
  // both stay mounted the whole time — this only controls which one shows.
  const [activeView, setActiveView] = useState<"terminal" | "editor">("terminal");

  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      setShowTerminalView(true);
    }
  }, [isActive]);

  // Whenever sessionId changes — a session ended (goes to null) or a
  // brand-new session started (goes to a fresh id) — any editor tabs
  // from the previous session are stale: they point at files inside a
  // container that no longer exists. Wipe them so the next session
  // always starts clean, whether it ended via the End Session button
  useEffect(() => {
    setTabs([]);
    setActiveTabId(null);
    setActiveView("terminal");
  }, [sessionId]);

 // Opens a file in a new tab, or switches to it if it's already open.
  //
  // Everything that decides "does this file already have a tab?" happens
  // inside the setTabs updater, reading only `prev` — React guarantees
  // `prev` is the true current state, even though this whole function is
  // a stale closure from Terminal's point of view (Terminal's socket
  // effect captures onOpenEditor once on mount and never refreshes it,
  // so the outer `tabs` variable it sees is frozen at mount-time). Also
  // using fileName itself as the tab id (filenames are already unique)
  // instead of crypto.randomUUID(), so there's nothing random or
  // side-effecting inside the updater.
  const openTab = (fileName: string, content: string) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.fileName === fileName);
      if (existing) {
        return prev.map((t) =>
          t.fileName === fileName ? { ...t, content, isDirty: false } : t
        );
      }
      return [...prev, { id: fileName, fileName, content, isDirty: false }];
    });

    setActiveTabId(fileName);
    setActiveView("editor");
  };
  // Called by Terminal when the user types `gedit programname.c`
  const handleOpenEditorFromTerminal = async (fileName: string) => {
    try {
      const response = await axios.get("http://localhost:3001/api/editor/read", {
        params: { sessionId, filePath: fileName },
      });
      openTab(fileName, response.data.content ?? "");
    } catch (error) {
      // File doesn't exist yet — that's fine, open a blank tab for it
      openTab(fileName, "");
    }
  };

  const handleTabContentChange = (id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t))
    );
  };

  const handleCloseTab = (id: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const next = remaining[remaining.length - 1];
        setActiveTabId(next ? next.id : null);
        if (!next) setActiveView("terminal");
      }
      return remaining;
    });
  };

  const handleRun = (command: string) => {
    if (typeof window !== "undefined") {
      const socket = (window as any).__terminal;
      if (socket) {
        socket.emit("terminal:input", command + "\n");
      }
    }
    setActiveView("terminal"); // jump to terminal so you can see the output
  };

  const handleBackFromTerminal = () => {
    setShowTerminalView(false);
  };

  const handleResumeTerminal = () => {
    setShowTerminalView(true);
  };

  if (!isActive || !showTerminalView) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <SessionCard
          status={status}
          statusMessage={statusMessage}
          startSession={startSession}
          endSession={endSession}
          canResume={isActive}
          onResume={handleResumeTerminal}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Back button header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <h2 className="font-semibold text-text">Terminal Session</h2>
      <div className="flex items-center gap-3">
          {tabs.length > 0 && activeView === "terminal" && (
            <button
              onClick={() => setActiveView("editor")}
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text transition-colors hover:bg-card hover:text-accent-blue"
            >
              Editor ({tabs.length})
            </button>
          )}
          <button
            onClick={handleBackFromTerminal}
            className="rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text transition-colors hover:bg-card hover:text-accent-blue"
          >
            ← Back to Session
          </button>
        </div>
      </div>

      {/* Both panes stay mounted at all times — visibility toggles with
          `hidden`, not conditional rendering, so the terminal's socket
          connection and any unsaved editor tabs are never lost. */}
      <div className="relative flex flex-1 bg-background">
        <div
          className={`flex flex-1 flex-col items-center justify-center p-8 overflow-auto ${
            activeView === "terminal" ? "" : "hidden"
          }`}
        >
          <Terminal
            active={isActive && activeView === "terminal"}
            sessionId={sessionId ?? ""}
            onOpenEditor={handleOpenEditorFromTerminal}
          />
        </div>

        <div className={`flex-1 ${activeView === "editor" ? "flex" : "hidden"}`}>
          <CodeEditor
            tabs={tabs}
            activeTabId={activeTabId}
            sessionId={sessionId ?? ""}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onContentChange={handleTabContentChange}
            onRun={handleRun}
            onBackToTerminal={() => setActiveView("terminal")}
          />
        </div>
      </div>
    </div>
  );
}