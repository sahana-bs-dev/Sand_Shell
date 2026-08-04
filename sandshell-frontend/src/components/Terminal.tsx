"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { io, Socket } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  active: boolean;
}

export default function Terminal({ active }: TerminalProps) {
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

    term.onData((data) => {
      socket.emit("terminal:input", data);
    });

    socket.on("terminal:output", (data: string) => {
      term.write(data);
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      socket.disconnect();
      term.dispose();
      xtermRef.current = null;
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
          ubuntu@sandshell — 80x24
        </span>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} className="h-[400px] w-full p-3" />
    </div>
  );
}