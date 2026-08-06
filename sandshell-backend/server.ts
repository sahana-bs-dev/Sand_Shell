import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import {
  getContainerId,
  touchSession,
  getIdleSessions,
  removeSession,
} from "./src/lib/sessionStore";
import { docker } from "./src/lib/docker";

// A session with no connected socket for longer than this is considered
// abandoned (tab closed, browser crashed, network dropped without ever
// reconnecting) and its container gets cleaned up automatically.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const REAPER_INTERVAL_MS = 60 * 1000; // check once a minute

// sessionIds that currently have a live, connected socket — the reaper
// must never remove one of these, no matter how old its lastActiveAt is.
const connectedSessions = new Set<string>();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3001;

// Next.js's own request handler — this still serves /api/health,
// /api/session/start, /api/session/end exactly as before.
const app = next({ dev, hostname, port });
const handleNextRequest = app.getRequestHandler();

// Manual replacement for docker.modem.demuxStream — on this setup,
// dockerode's built-in demuxer was NOT stripping Docker's stdcopy framing
// (1 byte channel + 3 reserved bytes + 4-byte big-endian length, repeating),
// even though Tty:true is supposed to disable framing entirely and even
// after routing through demuxStream(). Observed test output showed the raw
// header bytes still present, so we parse the frame format ourselves
// instead of depending on a library behavior that isn't matching docs here.
function demuxDockerStream(
  rawStream: NodeJS.ReadableStream,
  onText: (text: string) => void
) {
  let buffer = Buffer.alloc(0);

  rawStream.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 8) {
      const payloadLength = buffer.readUInt32BE(4);
      if (buffer.length < 8 + payloadLength) break; // wait for the rest

      const payload = buffer.subarray(8, 8 + payloadLength);
      onText(payload.toString("utf-8"));
      buffer = buffer.subarray(8 + payloadLength);
    }
  });
}

// Finds sessions whose lastActiveAt is older than IDLE_TIMEOUT_MS and
// have no currently connected socket, and destroys their containers.
// This is what actually closes the gap the beforeunload popup doesn't:
// closing a tab (or losing network) doesn't call any cleanup API, it
// just warns the user — so without this, an abandoned session's
// container would run forever.
async function reapIdleSessions() {
  const idle = getIdleSessions(IDLE_TIMEOUT_MS);

  for (const { sessionId, containerId } of idle) {
    if (connectedSessions.has(sessionId)) continue; // still connected — never idle

    try {
      const container = docker.getContainer(containerId);
      await container.stop();
      await container.remove();
      console.log(
        `[reaper] removed idle session ${sessionId} (container ${containerId})`
      );
    } catch (error) {
      console.error(
        `[reaper] failed to remove container for idle session ${sessionId}:`,
        error
      );
    } finally {
      // Drop it from the store either way — if Docker removal failed
      // because the container was already gone, retrying forever isn't
      // useful, and a stale mapping is worse than none.
      removeSession(sessionId);
    }
  }
}

app.prepare().then(() => {
  // One raw HTTP server now handles BOTH plain HTTP (Next.js API routes)
  // AND the WebSocket upgrade traffic Socket.IO needs. This is the piece
  // that was structurally missing — App Router route handlers alone can't
  // hold a persistent socket connection open.
  const httpServer = createServer((req, res) => {
    handleNextRequest(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Resolve socket -> sessionId -> containerId, open a persistent shell,
  // then forward real browser keystrokes into it.
  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    // Scoped to this one socket connection — holds the live shell stream
    // once terminal:join resolves it, so terminal:input can reach it.
    let shellStream: NodeJS.WritableStream | null = null;
    let exec: any = null; // Store exec reference for resize operations
    let currentSessionId: string | null = null; // Track which session this socket belongs to
    let currentContainerId: string | null = null; // Track which container this socket belongs to

    socket.on("terminal:join", async (sessionId: string) => {
      const containerId = getContainerId(sessionId);

      if (!containerId) {
        console.log(
          `[socket] ${socket.id} tried to join unknown session ${sessionId}`
        );
        return;
      }

      // Store session/container info for cleanup on disconnect
      currentSessionId = sessionId;
      currentContainerId = containerId;
      connectedSessions.add(sessionId);
      touchSession(sessionId);

      console.log(
        `[socket] ${socket.id} joined session ${sessionId} → container ${containerId}`
      );

      // Open a persistent interactive shell (/bin/bash) inside this
      // container. AttachStdin: true gives us a duplex stream we keep
      // writing to for the lifetime of this socket.
      try {
        const container = docker.getContainer(containerId);
        exec = await container.exec({
          Cmd: ["/bin/bash"],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          WorkingDir: "/root",
        });

        const stream = await exec.start({ hijack: true, stdin: true });
        shellStream = stream;

        demuxDockerStream(stream, (text) => {
          socket.emit("terminal:output", text);
        });
      } catch (error) {
        console.error(`[shell] failed for session ${sessionId}:`, error);
      }
    });

    // Forward real browser keystrokes straight into the shell's stdin.
    // Terminal.tsx emits this via term.onData(). Output flows back via
    // terminal:output above, so what you type now appears live on screen.
    socket.on("terminal:input", (data: string) => {
      if (!shellStream) {
        console.log(
          `[socket] ${socket.id} sent input before shell was ready — dropped`
        );
        return;
      }
      shellStream.write(data);
    });

    // Handle terminal resize events — when the browser window resizes,
    // we need to tell the container's shell the new dimensions so that
    // full-screen programs (vim, top, less, etc.) display correctly.
    socket.on("terminal:resize", (data: { cols: number; rows: number }) => {
      if (!exec) {
        console.log(
          `[socket] ${socket.id} tried to resize before shell was ready — dropped`
        );
        return;
      }
      try {
        exec.resize({ h: data.rows, w: data.cols });
        console.log(
          `[socket] ${socket.id} resized to ${data.cols}x${data.rows}`
        );
      } catch (error) {
        console.error(`[socket] resize failed for ${socket.id}:`, error);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[socket] client disconnected: ${socket.id} (${reason}) - session: ${currentSessionId}, container: ${currentContainerId}`
      );

      // Clean up the shell stream when socket disconnects
      // (e.g., browser tab closes, network drops, user navigates away)
      if (shellStream) {
        try {
          if (
            shellStream &&
            typeof (shellStream as any).destroy === "function"
          ) {
            (shellStream as any).destroy();
          }
          console.log(`[cleanup] destroyed shell stream for socket ${socket.id}`);
        } catch (error) {
          console.error(
            `[cleanup] failed to destroy stream for socket ${socket.id}:`,
            error
          );
        }
        shellStream = null;
      }

      // Clean up exec reference
      if (exec) {
        console.log(
          `[cleanup] cleared exec reference for socket ${socket.id} (session: ${currentSessionId})`
        );
        exec = null;
      }

      // No longer connected — the idle clock for this session starts
      // now, not from the last keystroke. The reaper (running on its own
      // interval) will remove the container if nothing reconnects within
      // IDLE_TIMEOUT_MS. This is what actually closes the container when
      // a tab is closed without clicking "End Session" — the beforeunload
      // popup alone never did this.
      if (currentSessionId) {
        connectedSessions.delete(currentSessionId);
        touchSession(currentSessionId);
      }

      // Note: Container persists until explicitly ended via the END SESSION button
      // This allows reconnection if needed. Uncomment below to auto-remove on disconnect.
      // if (currentContainerId) {
      //   docker.getContainer(currentContainerId).stop().then(() =>
      //     docker.getContainer(currentContainerId).remove()
      //   ).catch(err => console.error("[cleanup] failed to remove container:", err));
      // }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> SandShell backend ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO listening on the same port`);
  });

  setInterval(() => {
    reapIdleSessions().catch((error) =>
      console.error("[reaper] unexpected error:", error)
    );
  }, REAPER_INTERVAL_MS);
  console.log(
    `> Idle reaper running — checking every ${REAPER_INTERVAL_MS / 1000}s, timeout ${IDLE_TIMEOUT_MS / 60000}m`
  );
});