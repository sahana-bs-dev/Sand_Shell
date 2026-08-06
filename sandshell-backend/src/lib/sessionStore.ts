// In-memory store mapping sessionId -> { containerId, lastActiveAt }
// Resets if the server restarts — fine for practice-scale, not for production
//
// Pinned to globalThis on purpose: Next.js API routes are loaded through
// Next's own bundler, while server.ts is loaded directly by tsx. Without
// this, those two module systems each get their own separate copy of this
// file, meaning addSession() and getContainerId() would silently operate
// on two different Maps.
interface SessionRecord {
  containerId: string;
  lastActiveAt: number; // epoch ms — updated on connect/disconnect, used by the idle reaper
}

declare global {
  // eslint-disable-next-line no-var
  var __sandshellSessions: Map<string, SessionRecord> | undefined;
}

const sessions =
  globalThis.__sandshellSessions ?? new Map<string, SessionRecord>();
globalThis.__sandshellSessions = sessions;

export function addSession(sessionId: string, containerId: string) {
  sessions.set(sessionId, { containerId, lastActiveAt: Date.now() });
}

export function getContainerId(sessionId: string): string | undefined {
  return sessions.get(sessionId)?.containerId;
}

// Reset a session's idle clock — called when a socket connects/joins, and
// again when it disconnects (so the idle window starts counting from the
// moment the browser actually left, not from the last keystroke).
export function touchSession(sessionId: string) {
  const record = sessions.get(sessionId);
  if (record) record.lastActiveAt = Date.now();
}

export function removeSession(sessionId: string) {
  sessions.delete(sessionId);
}

// Returns every session whose lastActiveAt is older than idleMs. The
// caller (the reaper in server.ts) is still responsible for skipping any
// session that currently has a connected socket — this function only
// knows about timestamps, not live connections.
export function getIdleSessions(
  idleMs: number
): Array<{ sessionId: string; containerId: string }> {
  const now = Date.now();
  const idle: Array<{ sessionId: string; containerId: string }> = [];
  for (const [sessionId, record] of sessions.entries()) {
    if (now - record.lastActiveAt > idleMs) {
      idle.push({ sessionId, containerId: record.containerId });
    }
  }
  return idle;
}