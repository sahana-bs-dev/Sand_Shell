"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Play } from "lucide-react";
import axios from "axios";

interface CodeEditorProps {
  fileName: string;
  initialContent: string;
  sessionId: string;
  onClose: () => void;
  onRun: (command: string) => void;
}

export default function CodeEditor({
  fileName,
  initialContent,
  sessionId,
  onClose,
  onRun,
}: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const editorRef = useRef(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/editor/save",
        {
          sessionId,
          fileName,
          content,
        }
      );

      if (response.data.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    // Determine how to run based on file extension
    const ext = fileName.split(".").pop()?.toLowerCase();
    let command = "";

    if (ext === "c") {
      const baseName = fileName.replace(".c", "");
      command = `gcc ${fileName} -o ${baseName} && ./${baseName}`;
    } else if (ext === "py") {
      command = `python3 ${fileName}`;
    } else if (ext === "js") {
      command = `node ${fileName}`;
    } else if (ext === "sh") {
      command = `bash ${fileName}`;
    } else {
      // Default: try to execute directly
      command = `./${fileName}`;
    }

    onRun(command);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-[#111116] px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{fileName}</h2>
          {saveStatus === "success" && (
            <span className="text-sm text-green-400">✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-400">✗ Save failed</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            Save
          </button>

          <button
            onClick={handleRun}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
          >
            <Play size={16} />
            Run
          </button>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[#1a1a20]"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          defaultLanguage={getLanguage(fileName)}
          value={content}
          onChange={(value) => setContent(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>
    </div>
  );
}

function getLanguage(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    c: "c",
    cpp: "cpp",
    py: "python",
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "typescript",
    java: "java",
    go: "go",
    rs: "rust",
    sh: "shell",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
  };
  return languageMap[ext || ""] || "plaintext";
}