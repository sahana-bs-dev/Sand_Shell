import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { getContainerId } from "./src/lib/sessionStore";
import { docker } from "./src/lib/docker";

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

    socket.on("terminal:join", async (sessionId: string) => {
      const containerId = getContainerId(sessionId);

      if (!containerId) {
        console.log(
          `[socket] ${socket.id} tried to join unknown session ${sessionId}`
        );
        return;
      }

      console.log(
        `[socket] ${socket.id} joined session ${sessionId} → container ${containerId}`
      );

      // Open a persistent interactive shell (/bin/bash) inside this
      // container. AttachStdin: true gives us a duplex stream we keep
      // writing to for the lifetime of this socket.
      try {
        const container = docker.getContainer(containerId);
        const exec = await container.exec({
          Cmd: ["/bin/bash"],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
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

    socket.on("disconnect", (reason) => {
      console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> SandShell backend ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO listening on the same port`);
  });
});