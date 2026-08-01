export type SessionStatus = "offline" | "connecting" | "online";

export interface SessionState {
  status: SessionStatus;
  statusMessage: string;
}
