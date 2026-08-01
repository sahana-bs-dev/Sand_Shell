"use client";

import { motion } from "framer-motion";
import { SquareTerminal } from "lucide-react";
import StartButton from "./StartButton";
import EndButton from "./EndButton";
import type { SessionStatus } from "@/types/session";

const BADGE_STYLES = {
  offline: "bg-text/5 text-muted border-border",
  connecting: "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30",
  online: "bg-accent-green/10 text-accent-green border-accent-green/30",
};

const BADGE_LABEL = {
  offline: "Offline",
  connecting: "Connecting",
  online: "Online",
};

interface SessionCardProps {
  status: SessionStatus;
  statusMessage: string;
  startSession: () => void;
  endSession: () => void;
}

export default function SessionCard({
  status,
  statusMessage,
  startSession,
  endSession,
}: SessionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/30"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg text-accent-blue">
          <SquareTerminal size={20} />
        </span>
        <div>
          <h1 className="text-base font-semibold text-text">
            Ubuntu Session
          </h1>
          <p className="text-[12px] text-muted">Backend Status</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-medium ${BADGE_STYLES[status]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "online"
                ? "bg-accent-green shadow-glow-green"
                : status === "connecting"
                ? "animate-pulse bg-[#E8A33D]"
                : "bg-muted"
            }`}
          />
          {BADGE_LABEL[status]}
        </span>
      </div>

      <div className="mt-7 flex gap-3">
        <StartButton
          className="flex-1"
          onClick={startSession}
          disabled={status !== "offline"}
        />
        <EndButton
          className="flex-1"
          onClick={endSession}
          disabled={status === "offline"}
        />
      </div>

      <p className="mt-5 text-center font-mono text-[12px] text-muted">
        {statusMessage}
      </p>
    </motion.div>
  );
}
