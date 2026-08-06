"use client";

import { useState } from "react";
import axios from "axios";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import FileExplorer from "@/components/FileExplorer";
import SessionCard from "@/components/SessionCard";
import { useSession } from "@/hooks/useSession";

export default function SessionPage() {
  const { sessionId, isActive, startSession, endSession } = useSession();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState("");
  const [editorContent, setEditorContent] = useState("");

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

  if (!isActive) {
    return (
      <SessionCard onStart={startSession} onEnd={endSession} isActive={isActive} />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <FileExplorer sessionId={sessionId} onFileClick={handleFileClick} />

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        <Terminal
          active={isActive}
          sessionId={sessionId}
          onOpenEditor={handleOpenEditorFromTerminal}
        />
      </div>

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