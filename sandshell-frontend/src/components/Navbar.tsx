"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border/80 bg-bg/80 px-6 py-4 backdrop-blur-md sm:px-10"
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/logo.svg" alt="SandShell" width={32} height={32} priority />
        <span className="font-mono text-[15px] font-semibold tracking-tight">
          SandShell
        </span>
      </Link>

      <div className="hidden items-center gap-8 text-sm text-muted sm:flex">
        <a href="/">Back to home</a> 
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-3 sm:hidden">
        <ThemeToggle />
      </div>
    </motion.nav>
  );
}
