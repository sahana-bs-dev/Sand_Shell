"use client";

import { MouseEvent, ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Square } from "lucide-react";
import { cn } from "@/utils/cn";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface EndButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  showIcon?: boolean;
}

export default function EndButton({
  onClick,
  disabled,
  children = "End Session",
  className,
  showIcon = true,
}: EndButtonProps) {
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
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-danger bg-transparent px-6 py-3 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    >
      {showIcon && <Square size={15} />}
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/20 animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </motion.button>
  );
}
