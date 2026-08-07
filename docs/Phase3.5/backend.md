# 1. Architecture at a Glance

Three layers, stacked on top of each other:

- **Docker layer** — creates and destroys the actual Ubuntu containers.
- **Terminal layer (server.ts)** — keeps a live, typing-in-real-time shell connected to the browser.
- **Editor layer (`/api/editor/*`)** — lets the browser read/write files inside a container, and lists them.

Everything sits on one shared idea: one `sessionId` equals one running Docker container, and that mapping lives in a single in-memory store.

# 2. Backend, In Detail

## 2.1 Setup and the sandbox image

```
cd sandshell-backend
npm install
npm run dev
```

This starts the backend on port 3001. Docker Desktop must already be running — the backend connects to the local Docker engine on startup, and session creation fails with a connection error if it isn't up.

The sandbox image is built once:

open new terminal and below command to create the image its created only once no need to create everytime 
```
docker build -t sandshell-ubuntu -f sandshell-backend/Dockerfile sandshell-backend
```

The Dockerfile itself is deliberately minimal:

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y build-essential nano vim python3 \
    && rm -rf /var/lib/apt/lists/*
CMD ["tail", "-f", "/dev/null"]
```

- `build-essential` → gives gcc/g++ for compiling C/C++.
- `python3` → runs Python code.
- `nano`, `vim` → installed but not actually used from inside the container — see the "gedit trick" in Section 3.4.
- `tail -f /dev/null` → does nothing, forever. Without this the container would exit immediately, because Docker containers stop as soon as their main command finishes.

**Image vs. container:** the image is a blueprint, built once. Every time a user clicks "Start," the code calls `docker.createContainer({ Image: 'sandshell-ubuntu', ... })` and gets a brand-new, disposable container from that blueprint — a couple of seconds, and it never touches the image itself.

## 2.2 Session lifecycle

- **`POST /api/session/start`** — creates a container, starts it, generates a random `sessionId` (`crypto.randomUUID()`), and stores `sessionId → { containerId, lastActiveAt }` in an in-memory Map. This resets if the server restarts — fine for a project, not for production.
- **`DELETE /api/session/end`** — looks up the container, force-disconnects any live sockets for that session first (so Docker doesn't error out mid-teardown), stops the container, then removes it with `force: true`.

### The idle reaper

If someone just closes the browser tab instead of clicking "End Session," no cleanup API ever gets called. `server.ts` runs a background check every 60 seconds: any session with no currently connected socket for more than 5 minutes gets its container force-stopped and removed automatically. This is what stops abandoned containers from running forever and eating up the host machine's resources — and it isn't mentioned in the original Phase 3.5 docs at all.

## 2.3 The terminal (server.ts) — the live typing part

This file does something the App Router's normal API routes can't: it holds a persistent, two-way connection open (via Socket.IO) instead of one request → one response. What happens when a session opens:

- Browser connects → emits `terminal:join` with the `sessionId`.
- Server looks up the container for that session, opens a real `/bin/bash` shell inside it (`container.exec({ Cmd: ["/bin/bash"], Tty: true, ... })`), and keeps that shell's input/output stream open for as long as the socket is connected.
- Every keystroke typed (`terminal:input`) gets written straight into that shell's stdin.
- Everything the shell prints comes back over `terminal:output` and is displayed live.
- Resizing the browser window sends `terminal:resize`, telling the container's shell the new width/height so full-screen programs (`top`, `less`) draw correctly.

### A real bug that got fixed here

Docker doesn't send the shell's output as plain text — each chunk is wrapped in an 8-byte binary header (1 byte for stream type, 3 reserved, 4 bytes for length, big-endian). `dockerode` is supposed to strip this automatically via `demuxStream()`, but on this setup it wasn't: the raw header bytes were still showing up in the output even with `Tty: true` set. So `server.ts` includes a hand-written parser, `demuxDockerStream`, that buffers incoming chunks, reads the 8-byte header itself once enough bytes have arrived, and pulls out just the payload text:

```javascript
function demuxDockerStream(rawStream, onText) {
  let buffer = Buffer.alloc(0);
  rawStream.on("data", (chunk) => {
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
```

This is a genuinely non-obvious bug to catch — it requires knowing Docker's stdcopy wire format and noticing that a supposedly-automatic library behavior wasn't happening. It's worth calling out explicitly in interviews.

### Cleanup on disconnect

When a socket disconnects (tab closed, network dropped, navigated away), the server destroys that shell stream and clears its tracking — but it does not kill the container. The container survives until either "End Session" is clicked or the idle reaper decides 5 minutes have passed with nobody connected. This lets a user reconnect to the same session without losing their work.

## 2.4 Editor endpoints (`/api/editor/`)

All three live under `sandshell-backend/src/app/api/editor/`, and none of them touch the backend server's own filesystem — every read/write happens inside the isolated container via Docker's API. That's what keeps a user's code sandboxed away from the real server.

**`save/route.ts`** — writes code into the container
Takes `{ sessionId, fileName, content }` from the frontend and writes it in. It doesn't do a simple file copy — it builds a tar archive by hand, byte by byte (a 200+ line header, file size encoded in octal, a checksum, zero-padding), because that's the exact format Docker's `putArchive()` API expects. This is the same underlying mechanism `docker cp` uses.

**`read/route.ts`** — reads a file's current content
Runs `cat filePath` inside the container via `container.exec()`. The same 8-byte framing issue from the terminal shows up here too — solved with `Tty: true` plus `docker.modem.demuxStream()` to separate stdout from stderr cleanly. If the file doesn't exist yet, it just returns empty content instead of erroring, so opening a brand-new file works.

**`files/[sessionId]/route.ts`** — lists files in the container
Runs `find /root -maxdepth 3 ...` inside the container and turns the flat list of paths into a nested tree (`buildFileTree`). This was originally for a sidebar file browser that's since been removed from the UI — the endpoint still works, it's just unused right now. (Confirmed: `FileExplorer.tsx` still exists in the frontend source but isn't imported anywhere — genuinely dead code, not a leftover bug.)

## 2.5 How "Run" actually works

There's no dedicated "execute this code" endpoint. Clicking Run on the frontend just builds a normal shell command for the file type (e.g. `gcc file.c -o file && ./file`) and sends it through the same Socket.IO channel the terminal already uses — so it behaves exactly as if the command had been typed by hand. One pipeline handles both.

## 2.6 Backend packages

| Package | Purpose |
|---|---|
| `next` | API route structure and project framework. |
| `react`, `react-dom` | Required by Next.js internally. |
| `dockerode` | Talks to the Docker Engine API — create/start/stop containers, run commands inside them. |
| `socket.io` | Server side of the live terminal connection. |
| `tsx` | Runs the TypeScript custom server (server.ts) directly in dev, no build step needed. |