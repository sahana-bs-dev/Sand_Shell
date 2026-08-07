export type SessionStatus = "offline" | "connecting" | "online" | "ending";

export interface SessionState {
  status: SessionStatus;
  statusMessage: string;
}

export interface EditorTab {
  id: string;
  fileName: string;
  content: string;
  isDirty: boolean;
}