"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "sandshell-theme";

export default function ThemeToggle() {
  // Starts null so we don't render a guess before we've checked the
  // actual class on <html> (set synchronously by the layout script).
  const [isLight, setIsLight] = useState<boolean | null>(null);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just
      // won't persist across reloads, which is fine.
    }
    setIsLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors duration-200 hover:border-accent-blue/50 hover:text-accent-blue"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLight === null ? (
          <span className="block h-[17px] w-[17px]" />
        ) : (
          <motion.span
            key={isLight ? "sun" : "moon"}
            initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            {isLight ? <Sun size={17} /> : <Moon size={17} />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
