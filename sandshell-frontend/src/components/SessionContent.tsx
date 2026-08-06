"use client";

import SessionCard from "./SessionCard";
import Terminal from "./Terminal";
import { useSession } from "@/hooks/useSession";

export default function SessionContent() {
  const { status, statusMessage, sessionId, startSession, endSession } = useSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <SessionCard
        status={status}
        statusMessage={statusMessage}
        startSession={startSession}
        endSession={endSession}
      />
      {status === "online" && sessionId && (
        <Terminal active={status === "online"} sessionId={sessionId} />
      )}
    </div>
  );
}