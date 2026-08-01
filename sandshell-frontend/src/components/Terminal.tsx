"use client";

import {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { SquareTerminal } from "lucide-react";
import { cn } from "@/utils/cn";

interface Line {
  id: number;
  type: "input" | "output";
  text: string;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

const PROMPT = "guest@sandshell:~$";

const WELCOME_LINES = [
  "SandShell v1.0 — Ubuntu 22.04 LTS (mock shell)",
  "Type 'help' to see available commands.",
];

/**
 * Canned command handler. Purely local/visual — no execution happens.
 * Replace this with a real PTY/websocket bridge once the backend is
 * wired up; the rest of the component (history, scrollback, input)
 * can stay as-is.
 */
function runCommand(raw: string): string[] {
  const trimmed = raw.trim();
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const args = rest.join(" ");

  switch (cmd) {
    case "":
      return [];
    case "help":
      return [
        "Available commands:",
        "  help        show this message",
        "  whoami      print the current user",
        "  pwd         print working directory",
        "  ls          list directory contents",
        "  date        show the current date/time",
        "  uptime      show mock session uptime",
        "  echo <msg>  print a message back",
        "  clear       clear the terminal",
      ];
    case "whoami":
      return ["guest"];
    case "pwd":
      return ["/home/guest"];
    case "ls":
      return ["Desktop  Documents  Downloads  README.md"];
    case "date":
      return [new Date().toString()];
    case "uptime":
      return ["up 0 min, 1 user, load average: 0.00, 0.00, 0.00 (mock)"];
    case "echo":
      return [args || ""];
    case "clear":
      return ["__CLEAR__"];
    default:
      return [`command not found: ${cmd}`];
  }
}

interface TerminalProps {
  /** Whether the session is "online" — controls the disabled overlay. */
  active: boolean;
}

export default function Terminal({ active }: TerminalProps) {
  const [lines, setLines] = useState<Line[]>(
    WELCOME_LINES.map((text) => ({ id: nextId(), type: "output", text }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  function submit() {
    const value = input;
    const echoLine: Line = { id: nextId(), type: "input", text: value };
    const output = runCommand(value);

    if (output[0] === "__CLEAR__") {
      setLines([]);
    } else {
      setLines((prev) => [
        ...prev,
        echoLine,
        ...output.map((text) => ({ id: nextId(), type: "output" as const, text })),
      ]);
    }

    if (value.trim()) {
      setHistory((prev) => [...prev, value]);
    }
    setHistoryIndex(null);
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex =
        historyIndex === null
          ? history.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/30 transition-opacity duration-300",
        !active && "opacity-60"
      )}
      onClick={() => active && inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 border-b border-border bg-bg px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E8A33D]" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
        <span className="ml-2 flex items-center gap-1.5 font-mono text-[11px] text-muted">
          <SquareTerminal size={12} />
          guest@sandshell — 80x24
        </span>
      </div>

      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-6"
      >
        {lines.map((line) =>
          line.type === "input" ? (
            <div key={line.id} className="text-text">
              <span className="text-accent-green">{PROMPT}</span> {line.text}
            </div>
          ) : (
            <div key={line.id} className="whitespace-pre-wrap text-muted">
              {line.text}
            </div>
          )
        )}

        <div className="flex items-center text-text">
          <span className="text-accent-green">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!active}
            autoComplete="off"
            spellCheck={false}
            aria-label="Terminal input"
            className="ml-2 flex-1 bg-transparent font-mono text-[13px] text-text outline-none placeholder:text-muted disabled:cursor-not-allowed"
            placeholder={active ? "" : "start a session to use the terminal"}
          />
        </div>
      </div>

      {!active && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-bg/10 pb-4">
          <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted shadow-lg">
            Start a session to use the terminal
          </span>
        </div>
      )}
    </div>
  );
}
