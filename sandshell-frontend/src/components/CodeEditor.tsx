"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Play, ArrowLeft } from "lucide-react";
import axios from "axios";
import type { EditorTab } from "@/types/session";

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  sessionId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onRun: (command: string) => void;
  onBackToTerminal: () => void;
}

export default function CodeEditor({
  tabs,
  activeTabId,
  sessionId,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onRun,
  onBackToTerminal,
}: CodeEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Esc goes back to the terminal — it does NOT close any tabs, so
  // whatever files you had open stay open in the background.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBackToTerminal();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onBackToTerminal]);

  if (!activeTab) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await axios.post("http://localhost:3001/api/editor/save", {
        sessionId,
        fileName: activeTab.fileName,
        content: activeTab.content,
      });

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

  const handleRun = () => {
    const fileName = activeTab.fileName;
    const ext = fileName.split(".").pop()?.toLowerCase();
    let command = "";

    if (ext === "c") {
      const outputPath = fileName.replace(/\.c$/, "");
      command = `gcc "${fileName}" -o "${outputPath}" && "${outputPath}"`;
    } else if (ext === "cpp") {
      const outputPath = fileName.replace(/\.cpp$/, "");
      command = `g++ "${fileName}" -o "${outputPath}" && "${outputPath}"`;
    } else if (ext === "py") {
      command = `python3 "${fileName}"`;
    } else if (ext === "js") {
      command = `node "${fileName}"`;
    } else if (ext === "sh") {
      command = `bash "${fileName}"`;
    } else {
      command = `"${fileName}"`;
    }

    onRun(command);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0f]">
      {/* Tab strip */}
      <div className="flex items-center gap-1 border-b border-border bg-[#111116] px-3 pt-2">
        <div className="flex flex-1 items-end gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 text-sm ${
                tab.id === activeTabId
                  ? "bg-[#1a1a20] text-white"
                  : "text-muted hover:bg-[#16161c]"
              }`}
            >
              <span className="max-w-[140px] truncate">
                {tab.fileName.split("/").pop()}
              </span>
              {tab.isDirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="rounded p-0.5 hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active file header */}
      <div className="flex items-center justify-between border-b border-border bg-[#111116] px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">{activeTab.fileName}</h2>
          {saveStatus === "success" && (
            <span className="text-sm text-green-400">✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-400">✗ Save failed</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTerminal}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-[#1a1a20] hover:text-white"
            title="Back to terminal (Esc)"
          >
            <ArrowLeft size={16} />
            Terminal
          </button>

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
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={activeTab.id}
          defaultLanguage={getLanguage(activeTab.fileName)}
          value={activeTab.content}
          onChange={(value) => onContentChange(activeTab.id, value || "")}
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