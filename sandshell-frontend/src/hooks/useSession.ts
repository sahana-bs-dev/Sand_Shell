"use client";

import { useCallback, useRef, useState } from "react";
import type { SessionStatus } from "@/types/session";

const STATUS_MESSAGE: Record<SessionStatus, string> = {
  offline: "Waiting for backend connection...",
  connecting: "Connecting to backend...",
  online: "Connected. Session is mock-active (no backend yet).",
};

/**
 * Local-only mock of the backend session lifecycle described in the
 * roadmap (GET /health, POST /session/start, DELETE /session/end).
 * No network calls are made here yet — this hook exists purely so the
 * session UI has something real to react to, and can be swapped for
 * actual API calls in the next phase without touching the components.
 */
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("offline");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSession = useCallback(() => {
    if (status !== "offline") return;
    setStatus("connecting");
    timeoutRef.current = setTimeout(() => {
      setStatus("online");
    }, 1400);
  }, [status]);

  const endSession = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("offline");
  }, []);

  return {
    status,
    statusMessage: STATUS_MESSAGE[status],
    startSession,
    endSession,
  };
}
