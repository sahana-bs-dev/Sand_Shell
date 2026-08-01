"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PROGRESS_TEXTS = [
  "Initializing...",
  "Connecting...",
  "Preparing Ubuntu...",
  "Almost Ready...",
];

// Total time the loading screen is visible for (matches the mock
// 5-second start-session flow before navigating to /session).
const TOTAL_DURATION_MS = 5000;

interface LoadingScreenProps {
  active: boolean;
}

export default function LoadingScreen({ active }: LoadingScreenProps) {
  const [textIndex, setTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setTextIndex(0);
      setProgress(0);
      return;
    }

    const textInterval = setInterval(() => {
      setTextIndex((i) => Math.min(i + 1, PROGRESS_TEXTS.length - 1));
    }, TOTAL_DURATION_MS / PROGRESS_TEXTS.length);

    const start = Date.now();
    const progressInterval = setInterval(() => {
      const pct = Math.min(
        100,
        Math.round(((Date.now() - start) / TOTAL_DURATION_MS) * 100)
      );
      setProgress(pct);
    }, 60);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="h-12 w-12 rounded-full border-[3px] border-border border-t-accent-blue"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />

          <h2 className="mt-7 text-lg font-semibold text-text">
            Creating Secure Ubuntu Environment...
          </h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={textIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-2 font-mono text-[13px] text-muted"
            >
              {PROGRESS_TEXTS[textIndex]}
            </motion.p>
          </AnimatePresence>

          <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-card">
            <motion.div
              className="h-full rounded-full bg-accent-blue"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
