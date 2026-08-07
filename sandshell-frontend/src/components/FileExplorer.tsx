"use client";

import { useState } from "react";
import { FileText, ChevronRight, ChevronDown, RefreshCw, FilePlus } from "lucide-react";
import axios from "axios";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  path: string;
}

interface FileExplorerProps {
  sessionId: string;
  onFileClick: (fileName: string, content: string) => void;
}

export default function FileExplorer({
  sessionId,
  onFileClick,
}: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/editor/files/${sessionId}`
      );
      setFiles(response.data.files);
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (filePath: string) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/editor/read`,
        {
          params: { sessionId, filePath },
        }
      );
      onFileClick(filePath, response.data.content);
    } catch (error) {
      console.error("Failed to read file:", error);
    }
  };

  const handleCreateFile = async () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    // Files always live under /root — same convention the rest of the
    // app uses (find /root ..., WorkingDir: /root in the shell exec).
    const fullPath = trimmed.startsWith("/") ? trimmed : `/root/${trimmed}`;

    try {
      // save/route.ts creates the file if it doesn't exist yet (cat > path)
      await axios.post("http://localhost:3001/api/editor/save", {
        sessionId,
        fileName: fullPath,
        content: "",
      });

      setNewFileName("");
      setIsCreating(false);
      await loadFiles();

      // Open it straight in the editor — no need to click it separately
      onFileClick(fullPath, "");
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-[#1a1a20]"
          style={{ marginLeft: `${level * 16}px` }}
        >
          {node.type === "directory" && (
            <button
              onClick={() => toggleExpand(node.path)}
              className="flex-shrink-0 p-0"
            >
              {expanded.has(node.path) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {node.type === "file" && (
            <span className="flex-shrink-0">
              <FileText size={16} />
            </span>
          )}

          <span
            onClick={() =>
              node.type === "file" && handleFileClick(node.path)
            }
            className={`flex-1 truncate ${
              node.type === "file"
                ? "cursor-pointer hover:text-blue-400"
                : "font-semibold"
            }`}
          >
            {node.name}
          </span>
        </div>

        {node.type === "directory" &&
          expanded.has(node.path) &&
          node.children && (
            <div>
              {renderTree(node.children, level + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <div className="w-64 border-r border-border bg-[#0f0f14] p-4 flex flex-col text-white">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Files</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="rounded p-1 text-white hover:bg-[#1a1a20] transition-colors"
            title="New file"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={loadFiles}
            disabled={isLoading}
            className="rounded p-1 text-white hover:bg-[#1a1a20] transition-colors"
            title="Refresh files"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="mb-2 px-1">
          <input
            autoFocus
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFileName("");
              }
            }}
            onBlur={handleCreateFile}
            placeholder="gedit.c"
            className="w-full rounded bg-[#1a1a20] px-2 py-1 text-sm text-white outline-none border border-blue-600"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-sm text-muted">Click ↻ to load files</p>
        ) : (
          renderTree(files)
        )}
      </div>
    </div>
  );
}