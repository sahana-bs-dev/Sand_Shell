"use client";

import { useCallback, useRef, useState } from "react";
import type { SessionStatus } from "@/types/session";

const STATUS_MESSAGE: Record<SessionStatus, string> = {
  offline: "Waiting for backend connection...",
  connecting: "Connecting to backend...",
  online: "Connected to backend.",
};

export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("offline");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSession = useCallback(async () => {
    if (status !== "offline") return;
    setStatus("connecting");

    try {
      const response = await fetch("http://localhost:3001/api/health");
      const data = await response.json();

      if (data.status === "ok") {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    } catch (error) {
      console.error("Backend not reachable:", error);
      setStatus("offline");
    }
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