// In-memory store mapping sessionId -> containerId
// Resets if the server restarts — fine for practice-scale, not for production
//
// Pinned to globalThis on purpose: Next.js API routes are loaded through
// Next's own bundler, while server.ts is loaded directly by tsx. Without
// this, those two module systems each get their own separate copy of this
// file, meaning addSession() and getContainerId() would silently operate
// on two different Maps.
declare global {
  // eslint-disable-next-line no-var
  var __sandshellSessions: Map<string, string> | undefined;
}

const sessions = globalThis.__sandshellSessions ?? new Map<string, string>();
globalThis.__sandshellSessions = sessions;

export function addSession(sessionId: string, containerId: string) {
  sessions.set(sessionId, containerId);
}

export function getContainerId(sessionId: string): string | undefined {
  return sessions.get(sessionId);
}

export function removeSession(sessionId: string) {
  sessions.delete(sessionId);
}