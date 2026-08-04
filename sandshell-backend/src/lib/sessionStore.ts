// In-memory store mapping sessionId -> containerId
// Resets if the server restarts — fine for practice-scale, not for production
const sessions = new Map<string, string>();

export function addSession(sessionId: string, containerId: string) {
  sessions.set(sessionId, containerId);
}

export function getContainerId(sessionId: string): string | undefined {
  return sessions.get(sessionId);
}

export function removeSession(sessionId: string) {
  sessions.delete(sessionId);
}