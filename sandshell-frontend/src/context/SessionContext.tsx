"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { SessionStatus } from "@/types/session";

const STATUS_MESSAGE: Record<SessionStatus, string> = {
  offline: "Waiting for backend connection...",
  connecting: "Connecting to backend...",
  online: "Connected. Ubuntu container is running.",
  ending: "Please wait, ending your session...",
};

interface SessionContextValue {
  status: SessionStatus;
  statusMessage: string;
  sessionId: string | null;
  startSession: () => Promise<boolean>;
  endSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("offline");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    if (status !== "offline") return status === "online";
    setStatus("connecting");

    try {
      const response = await fetch("http://localhost:3001/api/session/start", {
        method: "POST",
      });
      const data = await response.json();

      if (data.status === "ok") {
        setSessionId(data.sessionId);
        setStatus("online");
        return true;
      }

      setStatus("offline");
      return false;
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatus("offline");
      return false;
    }
  }, [status]);

  const endSession = useCallback(async () => {
    if (!sessionId) {
      setStatus("offline");
      return;
    }

    setStatus("ending");

    try {
      await fetch("http://localhost:3001/api/session/end", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setSessionId(null);
      setStatus("offline");
    }
  }, [sessionId]);

  return (
    <SessionContext.Provider
      value={{
        status,
        statusMessage: STATUS_MESSAGE[status],
        sessionId,
        startSession,
        endSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return ctx;
}