"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import StartButton from "./StartButton";

interface HeroProps {
  onStart: () => void;
  isStarting: boolean;
}

// Scripted boot sequence the terminal illustration "types" out, looping.
const BOOT_SEQUENCE: { text: string; tone: "cmd" | "out" }[] = [
  { text: "$ sandshell start", tone: "cmd" },
  { text: "→ pulling ubuntu:22.04 ...", tone: "out" },
  { text: "→ container ready in 1.2s", tone: "out" },
  { text: "$ whoami", tone: "cmd" },
  { text: "guest@sandshell", tone: "out" },
];

function TerminalIllustration() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const current = BOOT_SEQUENCE[lineIndex].text;

    if (charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 32);
      return () => clearTimeout(t);
    }

    const pause = setTimeout(
      () => {
        if (lineIndex < BOOT_SEQUENCE.length - 1) {
          setLineIndex((i) => i + 1);
          setCharIndex(0);
        } else {
          setTimeout(() => {
            setLineIndex(0);
            setCharIndex(0);
          }, 1600);
        }
      },
      current.startsWith("$") ? 300 : 550
    );

    return () => clearTimeout(pause);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, lineIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative mx-auto w-full max-w-md"
    >
      <div className="absolute -inset-8 -z-10 rounded-full bg-accent-blue/10 blur-3xl" />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-border bg-[#0D1117] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8A33D]" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
          <span className="ml-2 font-mono text-[11px] text-muted">
            ubuntu@sandshell — 80x24
          </span>
        </div>

        <div className="min-h-[220px] px-5 py-6 font-mono text-[13px] leading-8">
          {BOOT_SEQUENCE.slice(0, lineIndex).map((l, i) => (
            <div
              key={i}
              className={l.tone === "cmd" ? "text-accent-green" : "text-muted"}
            >
              {l.text}
            </div>
          ))}
          <div
            className={
              BOOT_SEQUENCE[lineIndex].tone === "cmd"
                ? "text-accent-green"
                : "text-muted"
            }
          >
            {BOOT_SEQUENCE[lineIndex].text.slice(0, charIndex)}
            <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-[2px] animate-caret bg-accent-blue align-middle" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Hero({ onStart, isStarting }: HeroProps) {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-20 pt-16 sm:px-10 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-green">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green shadow-glow-green" />
          Zero install sandbox
        </div>

        <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          SandShell
        </h1>
        <p className="mt-3 text-lg font-medium text-text/90 sm:text-xl">
          Secure Browser-Based Ubuntu Sandbox
        </p>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Start an isolated Ubuntu Linux environment directly in your
          browser without installing anything.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <StartButton onClick={onStart} disabled={isStarting}>
            {isStarting ? "Starting…" : "Start Session"}
          </StartButton>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-6 py-3 text-sm font-semibold text-text transition-colors duration-200 hover:border-accent-blue/60 hover:bg-card"
          >
            <ArrowRight size={16} />
            Learn More
          </motion.button>
        </div>

        <p className="mt-5 font-mono text-[11px] text-muted">
          no signup · no install · disposable in minutes
        </p>
      </motion.div>

      <TerminalIllustration />
    </section>
  );
}
