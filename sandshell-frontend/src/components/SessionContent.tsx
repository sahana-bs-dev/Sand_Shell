"use client";

import { useState } from "react";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import FileExplorer from "@/components/FileExplorer";
import SessionCard from "@/components/SessionCard";
import { useSession } from "@/hooks/useSession";

export default function SessionPage() {
  const { sessionId, isActive, startSession, endSession } = useSession();
  
  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // Handle file click from explorer
  const handleFileClick = (fileName: string, content: string) => {
    setEditorFile(fileName);
    setEditorContent(content);
    setEditorOpen(true);
  };

  // Handle run command from editor
  const handleRun = (command: string) => {
    // Send command to terminal via socket
    if (typeof window !== "undefined") {
      const socket = (window as any).__terminal;
      if (socket) {
        socket.emit("terminal:input", command + "\n");
      }
    }
  };

  // Show session card if not active
  if (!isActive) {
    return (
      <SessionCard
        onStart={startSession}
        onEnd={endSession}
        isActive={isActive}
      />
    );
  }

  // Show session with file explorer + terminal + editor
  return (
    <div className="flex h-screen bg-background">
      {/* File Explorer Sidebar */}
      <FileExplorer sessionId={sessionId} onFileClick={handleFileClick} />

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        <Terminal active={isActive} sessionId={sessionId} />
      </div>

      {/* Code Editor Modal - Opens when file clicked */}
      {editorOpen && (
        <CodeEditor
          fileName={editorFile}
          initialContent={editorContent}
          sessionId={sessionId}
          onClose={() => setEditorOpen(false)}
          onRun={handleRun}
        />
      )}
    </div>
  );
}