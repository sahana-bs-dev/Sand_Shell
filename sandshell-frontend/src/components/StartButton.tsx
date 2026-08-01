"use client";

import { MouseEvent, ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { cn } from "@/utils/cn";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface StartButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  showIcon?: boolean;
}

export default function StartButton({
  onClick,
  disabled,
  children = "Start Session",
  className,
  showIcon = true,
}: StartButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const ripple: Ripple = {
      id: Date.now(),
      x: e.clientX - rect.left - size / 2,
      y: e.clientY - rect.top - size / 2,
      size,
    };
    setRipples((prev) => [...prev, ripple]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);

    onClick?.();
  }

  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-accent-green px-6 py-3 text-sm font-semibold text-[#0D1117] transition-colors duration-200 hover:shadow-glow-green disabled:cursor-not-allowed disabled:bg-accent-green/40",
        className
      )}
    >
      {showIcon && <Play size={15} />}
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/30 animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </motion.button>
  );
}
