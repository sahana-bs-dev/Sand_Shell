"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  SquareTerminal,
  Clock,
  MousePointerClick,
  Box,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";

// Matches the duration LoadingScreen animates its progress bar for.
const SESSION_CREATE_DELAY_MS = 5000;

const FEATURES = [
  {
    icon: Shield,
    title: "Secure Containers",
    description: "Each user gets an isolated Ubuntu container.",
  },
  {
    icon: SquareTerminal,
    title: "Real Linux Terminal",
    description: "Execute Linux commands directly from the browser.",
  },
  {
    icon: Clock,
    title: "Temporary Sessions",
    description: "Containers automatically expire after inactivity.",
  },
];

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Click Start Session",
    description: "One click — no signup, no install.",
  },
  {
    icon: Box,
    title: "Ubuntu Container Starts",
    description: "A fresh, isolated container spins up for you.",
  },
  {
    icon: SquareTerminal,
    title: "Use Linux in Browser",
    description: "Run real commands straight from the tab.",
  },
];

function StepArrow({ index }: { index: number }) {
  return (
    <>
      <motion.div
        className="mx-auto flex justify-center py-2 sm:hidden"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.15 }}
      >
        <ArrowDown size={18} className="text-accent-blue/60" />
      </motion.div>
      <motion.div
        className="hidden items-center justify-center sm:flex"
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.15 }}
      >
        <ArrowRight size={18} className="text-accent-blue/60" />
      </motion.div>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  function handleStart() {
    if (isStarting) return;
    setIsStarting(true);

    // No backend yet — this is a mock delay standing in for the future
    // POST /session/start call. Swap this for a real API call later.
    setTimeout(() => {
      router.push("/session");
    }, SESSION_CREATE_DELAY_MS);
  }

  return (
    <>
      <Navbar />
      <Hero onStart={handleStart} isStarting={isStarting} />

      {/* Feature section */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-lg"
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for real Linux, not a simulation
          </h2>
          <p className="mt-3 text-[15px] text-muted">
            Every session runs inside its own disposable container —
            isolated, monitored, and gone the moment you close it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={i * 0.1}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl border-t border-border/70 px-6 py-20 sm:px-10"
      >
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-2xl font-bold tracking-tight sm:text-3xl"
        >
          How it works
        </motion.h2>

        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="contents">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: i * 0.12 }}
                  className="rounded-xl border border-border bg-card p-6 text-center"
                >
                  <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-accent-blue/40 bg-bg font-mono text-sm font-semibold text-accent-blue">
                    {i + 1}
                  </span>
                  <Icon size={20} className="mx-auto mb-3 text-text/80" />
                  <h3 className="text-[14px] font-semibold text-text">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-muted">
                    {step.description}
                  </p>
                </motion.div>
                {i < STEPS.length - 1 && <StepArrow index={i} />}
              </div>
            );
          })}
        </div>
      </section>

      <Footer />

      <LoadingScreen active={isStarting} />
    </>
  );
}
