"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -6 }}
      className="group rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-accent-blue/50 hover:bg-card-hover"
    >
      <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg text-accent-blue transition-colors group-hover:border-accent-blue/50">
        <Icon size={19} strokeWidth={2} />
      </span>
      <h3 className="text-[15px] font-semibold text-text">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        {description}
      </p>
    </motion.div>
  );
}
