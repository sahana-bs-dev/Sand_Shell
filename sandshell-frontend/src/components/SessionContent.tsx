"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import FileExplorer from "@/components/FileExplorer";
import SessionCard from "@/components/SessionCard";
import { useSession } from "@/hooks/useSession";

export default function SessionPage() {
  
  const { sessionId, status, statusMessage, startSession, endSession } = useSession();
   const isActive = status === "online";

  // NEW: Add state to toggle between terminal and session card views
  const [showTerminalView, setShowTerminalView] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // NEW: Show terminal when session is active
  useEffect(() => {
    if (isActive) {
      setShowTerminalView(true);
    }
  }, [isActive]);

  const handleFileClick = (fileName: string, content: string) => {
    setEditorFile(fileName);
    setEditorContent(content);
    setEditorOpen(true);
  };

  // NEW — called by Terminal when the user types `gedit programname.c`
  const handleOpenEditorFromTerminal = async (fileName: string) => {
    try {
      const response = await axios.get("http://localhost:3001/api/editor/read", {
        params: { sessionId, filePath: fileName },
      });
      setEditorFile(fileName);
      setEditorContent(response.data.content ?? "");
    } catch (error) {
      // File doesn't exist yet — that's fine, open a blank editor for it
      setEditorFile(fileName);
      setEditorContent("");
    } finally {
      setEditorOpen(true);
    }
  };

  const handleRun = (command: string) => {
    if (typeof window !== "undefined") {
      const socket = (window as any).__terminal;
      if (socket) {
        socket.emit("terminal:input", command + "\n");
      }
    }
  };

  // NEW: Handle going back from terminal to session card
  const handleBackFromTerminal = () => {
    setShowTerminalView(false);
  };

  // NEW: Handle resuming terminal view
  const handleResumeTerminal = () => {
    setShowTerminalView(true);
  };

  // MODIFIED: Check both isActive AND showTerminalView
  if (!isActive || !showTerminalView) {
    return (
      <SessionCard
        status={status}
        statusMessage={statusMessage}
        startSession={startSession}
        endSession={endSession}
        canResume={isActive}
        onResume={handleResumeTerminal}
      />
    );
  }

  // NEW: Terminal view with header and back button
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Back button header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <h2 className="font-semibold text-text">Terminal Session</h2>
        <button
          onClick={handleBackFromTerminal}
          className="rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text transition-colors hover:bg-card hover:text-accent-blue"
        >
          ← Back to Session
        </button>
      </div>

      {/* Terminal and file explorer */}
      <div className="flex flex-1 bg-background">
        <FileExplorer sessionId={sessionId ?? ""} onFileClick={handleFileClick} />

        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <Terminal
            active={isActive}
            sessionId={sessionId ?? ""}
            onOpenEditor={handleOpenEditorFromTerminal}
          />
        </div>

        {editorOpen && (
          <CodeEditor
            fileName={editorFile}
            initialContent={editorContent}
            sessionId={sessionId ?? ""}
            onClose={() => setEditorOpen(false)}
            onRun={handleRun}
          />
        )}
      </div>
    </div>
  );
}