"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { io, Socket } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  active: boolean;
  sessionId: string;
}

export default function Terminal({ active, sessionId }: TerminalProps) {
  const [dimensions, setDimensions] = useState({ cols: 80, rows: 24 });
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      theme: {
        background: "#0a0a0f",
        foreground: "#e5e5e5",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.write("SandShell terminal ready.\r\n");

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("terminal:join", sessionId);
      // Also send initial dimensions
      const { cols, rows } = term;
      socket.emit("terminal:resize", { cols, rows });
    });

    term.onData((data) => {
      socket.emit("terminal:input", data);
    });

    socket.on("terminal:output", (data: string) => {
      term.write(data);
    });

    const handleResize = () => {
      fitAddon.fit();
      // Get the actual dimensions after fitting and send to backend
      const { cols, rows } = term;
      setDimensions({ cols, rows });
      socket.emit("terminal:resize", { cols, rows });
    };
    window.addEventListener("resize", handleResize);

    // Show confirmation dialog when user tries to close the tab/window/navigate away
    // This warns them that the container will be destroyed
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message =
        "⚠️ Your SandShell terminal session will be closed and the container will be destroyed. Are you sure you want to exit?";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Clean up window resize listener
      window.removeEventListener("resize", handleResize);
      
      // Clean up beforeunload listener (confirmation dialog)
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      // Properly disconnect socket (triggers disconnect event on backend)
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("[cleanup] socket disconnected");
      }
      
      // Dispose xterm.js terminal
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
      
      // Clear refs
      xtermRef.current = null;
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active && fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, [active]);

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-[#0a0a0f] shadow-lg">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-[#111116] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="h-3 w-3 rounded-full bg-yellow-500" />
        <span className="h-3 w-3 rounded-full bg-green-500" />
        <span className="ml-3 font-mono text-xs text-muted">
          ubuntu@sandshell — {dimensions.cols}x{dimensions.rows}
        </span>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} className="h-[400px] w-full p-3" />
    </div>
  );
}