# SandShell — Phase 3 & Phase 4 Backend: How It Actually Works

This document explains, accurately and in detail, how the browser
terminal (Phase 3) and session/container isolation (Phase 4)
Every claim below is something you can point to a specific line of code for, which is what actually holds up in an interview.

---
# This for the understanding sake read this first and then proceed with the actual implementation 

The basic idea

Think of it like this: your browser shows a black terminal box, but the actual computer running your commands isn't your laptop — it's a tiny disposable Ubuntu computer living inside Docker on your machine. The browser box is just a window looking into that tiny computer.

Step by step, in plain English

1. You click "Start Session"
Your browser asks the backend: "give me a Linux box." The backend tells Docker to spin up a fresh, empty Ubuntu container — like renting a brand new empty computer that just turned on. Docker gives it an ID. The backend remembers: "this session ID belongs to this container ID," like a coat-check ticket.

2. The terminal box connects
Once the container exists, your browser opens a live phone line (the socket) to the backend and says "hey, I'm session #1234, connect me to my container." The backend looks up the coat-check ticket, finds the right container, and starts a real bash shell process inside it — same as if you'd typed bash on a real Ubuntu machine.

3. You type something, like ls
Every single letter you press is sent instantly over that phone line to the backend. The backend takes each letter and feeds it straight into that bash process's "ears" (its input), exactly like you were typing directly into that container.

4. The container replies
Bash does what bash always does — it processes what you typed, runs ls, and prints the folder listing. That output travels back over the same phone line to your browser, and the little terminal box on screen just displays whatever text arrives. It's not simulating anything — it's literally showing you real output from a real command.

5. Everything you do is real, but temporary
mkdir, rm, nano, installing packages — all of it genuinely happens inside that one container's filesystem. But that container only exists for as long as your session is alive.

6. Cleanup — two ways it happens

If you click "End Session," the backend tells Docker "destroy this container now." Gone immediately.
If you just close the tab without clicking anything, the backend notices the phone line went dead, but it doesn't panic-delete right away (in case you just had a hiccup and reconnect). Instead it starts a 5-minute timer. If nobody reconnects within 5 minutes, a background "janitor" process checks every minute for containers nobody's using anymore and quietly throws them away.
The one-sentence version

Your browser is a window; the backend is the receptionist who assigns you a real disposable Ubuntu computer, wires your keyboard directly into it over a live connection, and cleans up after you either the moment you leave, or a few minutes later if you just wander off.

## 1. The big picture — what problem this solves

A browser tab needs to behave like a real Linux terminal, where every
command you type executes for real inside an isolated Ubuntu Docker
container, and the output streams back live. Each session gets its own
container; ending the session destroys it.

```
Browser (xterm.js)
   │  keystrokes → socket.emit("terminal:input")
   ▼
Socket.IO (WebSocket)
   ▼
server.ts (Node.js custom server)
   │  shellStream.write(data)
   ▼
dockerode → container.exec() duplex stream
   ▼
Docker Engine
   ▼
/bin/bash running inside a specific Ubuntu container
```

Output flows back the same path in reverse.

---

## 2. Why a custom server exists at all (`server.ts`)

The backend started as pure Next.js App Router API routes
(`/api/session/start`, `/api/session/end`, `/api/health`). Route
handlers are strictly request → response — they cannot hold a
persistent WebSocket connection open. Socket.IO needs a raw
`http.Server` to attach to.

`server.ts` solves this by wrapping Next.js's own request handler
inside a plain `http.createServer()`, then attaching Socket.IO to that
*same* server:

```ts
const app = next({ dev, hostname, port });
const handleNextRequest = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handleNextRequest(req, res));
  const io = new Server(httpServer, { cors: { origin: "http://localhost:3000" } });
  httpServer.listen(port);
});
```

One process, one port. Plain HTTP requests still go through Next.js
exactly as before (the API routes are untouched); WebSocket upgrade
requests are handled by Socket.IO.

---

## 3. Socket.IO — what it is and why it's here

Socket.IO is a library for real-time, event-based, bidirectional
communication between a browser and a server, built on WebSockets. A
terminal needs a connection that stays open indefinitely, where either
side can push data at any moment — the opposite of a normal HTTP
request/response cycle.

Three custom events carry the entire terminal:

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `terminal:join` | browser → server | `sessionId: string` | Tells the backend which container this socket should attach to |
| `terminal:input` | browser → server | raw keystroke data: `string` | Forwarded straight into the shell's stdin |
| `terminal:output` | server → browser | raw shell output: `string` | Written straight into xterm.js |
| `terminal:resize` | browser → server | `{ cols: number, rows: number }` | Tells the container's shell the real terminal dimensions |

---

## 4. Phase 4 — Session ↔ Container mapping (`sessionStore.ts`)

Before any terminal logic runs, the backend needs to know: *given this
browser's session, which Docker container does it own?*

`POST /api/session/start` creates a Docker container (`Image: 'ubuntu'`,
kept alive via a long-running placeholder command), generates a
`sessionId`, and records the pair via `addSession(sessionId,
containerId)`. `sessionStore.ts` is an in-memory
`Map<sessionId, { containerId, lastActiveAt }>` — the `lastActiveAt`
timestamp was added later specifically to support the idle reaper (see
Section 10b), which needs to know not just *which* container a session
owns, but *when it was last actually connected to*.

### The subtle bug this project actually hit

Next.js API routes are loaded through Next's own bundler. `server.ts`
is loaded directly by `tsx`, completely outside that bundler. Even
though both files `import` the same `sessionStore.ts` source file, they
were being loaded into **two separate module registries** — meaning two
different `Map` objects existed in memory. A session added by the API
route was invisible to the socket handler in `server.ts`, so
`terminal:join` always failed with "unknown session."

**Fix:** pin the `Map` to `globalThis`, so no matter which module
system loads the file, they all share the same underlying object — the
same pattern used to avoid duplicate Prisma client instances in Next.js
dev mode:

```ts
declare global {
  var __sandshellSessions: Map<string, string> | undefined;
}
const sessions = globalThis.__sandshellSessions ?? new Map<string, string>();
globalThis.__sandshellSessions = sessions;
```

This is a strong interview story: it demonstrates understanding that
"same file" does not always mean "same module instance" in a hybrid
Next.js + custom-server setup, and diagnosing it by reasoning about
*where* each piece of code actually runs, not just what it imports.

---

## 5. Resolving a socket to a container (`terminal:join`)

A raw Socket.IO connection carries no context about which container it
belongs to. `Terminal.tsx` emits `terminal:join` with the `sessionId`
(obtained from the session-start API response) the moment the socket
connects:

```ts
socket.on("connect", () => {
  socket.emit("terminal:join", sessionId);
  const { cols, rows } = term;
  socket.emit("terminal:resize", { cols, rows });
});
```

The backend resolves it:

```ts
socket.on("terminal:join", async (sessionId: string) => {
  const containerId = getContainerId(sessionId);
  if (!containerId) { /* unknown session, bail out */ return; }
  currentSessionId = sessionId;
  currentContainerId = containerId;
  // ...open the shell (next section)
});
```

---

## 6. Opening the interactive shell — `docker exec`, not `docker attach`

`dockerode`'s `container.exec()` starts a **new process** inside an
already-running container (here, `/bin/bash`), rather than attaching to
the container's main process (which is just a keep-alive placeholder so
the container doesn't exit on its own).

```ts
exec = await container.exec({
  Cmd: ["/bin/bash"],
  AttachStdin: true,
  AttachStdout: true,
  AttachStderr: true,
  Tty: true,
});
const stream = await exec.start({ hijack: true, stdin: true });
shellStream = stream;
```

- `AttachStdin/Stdout/Stderr: true` — a real two-way pipe to this
  process, not fire-and-forget.
- `Tty: true` — allocates a pseudo-terminal, which is what makes the
  process *behave* like a terminal (prompts, colors, line editing,
  full-screen programs like `vim`/`top`) instead of a plain pipe. It
  also enables the resize mechanism in Section 8.
- `hijack: true, stdin: true` on `.start()` — tells dockerode to hand
  back a raw duplex stream instead of a one-shot response.

This one `bash` process **stays alive for the entire session** — real
shell state persists between commands (`cd /tmp` followed later by
`pwd` correctly returns `/tmp`), because it's the same process the
whole time, not a fresh exec per keystroke.

---

## 7. The Docker stream-framing issue (a genuinely good debugging story)

Docker's documentation states that with `Tty: true`, exec output is
plain text with no framing. In practice, on this project's environment
(Docker Desktop on Windows/WSL2), output still arrived with an 8-byte
binary header on every chunk — 1 byte stream type, 3 reserved bytes, a
4-byte big-endian payload length — the same "stdcopy" framing Docker
normally reserves for the non-TTY case. `dockerode`'s built-in
`docker.modem.demuxStream()` (designed for that non-TTY case) did not
correctly strip these headers here either.

Rather than depend on documented-but-inaccurate behavior, a small
manual parser was written directly against the observed byte layout:

```ts
function demuxDockerStream(rawStream, onText) {
  let buffer = Buffer.alloc(0);
  rawStream.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 8) {
      const payloadLength = buffer.readUInt32BE(4);
      if (buffer.length < 8 + payloadLength) break;
      const payload = buffer.subarray(8, 8 + payloadLength);
      onText(payload.toString("utf-8"));
      buffer = buffer.subarray(8 + payloadLength);
    }
  });
}
```

Good interview framing: *"the docs and the library's own demux helper
didn't match what was actually on the wire, so I inspected the raw
bytes and wrote a minimal parser against the real behavior instead of
the assumed behavior."*

---

## 8. Input, output, and resize — the live wiring

**Input** (browser → container):
```ts
socket.on("terminal:input", (data: string) => {
  if (!shellStream) return; // shell not ready yet, drop it
  shellStream.write(data);
});
```

**Output** (container → browser):
```ts
demuxDockerStream(stream, (text) => {
  socket.emit("terminal:output", text);
});
```
`Terminal.tsx` just writes whatever arrives straight into xterm.js:
```ts
socket.on("terminal:output", (data: string) => term.write(data));
```

**Resize** (browser → container): xterm.js's `FitAddon` resizes the
*visual* terminal to fit its container div; afterward, `term.cols` /
`term.rows` reflect the real character-grid dimensions, which get sent
to the backend:
```ts
const handleResize = () => {
  fitAddon.fit();
  const { cols, rows } = term;
  socket.emit("terminal:resize", { cols, rows });
};
```
The backend applies it to the actual exec'd process using dockerode's
resize call:
```ts
socket.on("terminal:resize", (data: { cols: number; rows: number }) => {
  if (!exec) return;
  exec.resize({ h: data.rows, w: data.cols });
});
```
This is why full-screen programs (`vim`, `top`, `less`) render at the
*actual* terminal size instead of a stale default — the pseudo-terminal
inside the container is told the real dimensions, not just the on-screen
box.

---

## 9. Per-socket isolation (Phase 4's core guarantee)

```ts
io.on("connection", (socket) => {
  let shellStream: NodeJS.WritableStream | null = null;
  let exec: any = null;
  let currentSessionId: string | null = null;
  let currentContainerId: string | null = null;
  // ...
});
```

`shellStream`, `exec`, and the tracked IDs are declared **inside** the
`connection` callback, so each socket connection gets its own
closure-scoped copies. If these were declared at module level instead,
every connected browser would share the same variables and could
overwrite each other's shell reference — one user's keystrokes ending
up in another user's container. This is the actual mechanism (not just
"each session has a container," but "each *socket* has its own private
handle to its container's shell") that keeps concurrent sessions from
interfering with each other.

---

## 10. Cleanup on disconnect — and what actually happens after that

```ts
socket.on("disconnect", (reason) => {
  if (shellStream) {
    (shellStream as any).destroy();
    shellStream = null;
  }
  if (exec) {
    exec = null;
  }
  if (currentSessionId) {
    connectedSessions.delete(currentSessionId);
    touchSession(currentSessionId); // starts the idle clock from now
  }
  // Container is NOT stopped/removed here directly — see Section 10b.
});
```

When a tab closes or the network drops:
- The shell's duplex stream is destroyed (frees the exec process's
  stdin/stdout handles on the backend side)
- The local `exec` reference is cleared
- The session is removed from `connectedSessions` and its idle clock
  (`lastActiveAt` in `sessionStore`) is reset to *now*

**The container is not destroyed immediately on disconnect** — that's
still a deliberate choice, so a brief network blip or an accidental tab
close doesn't instantly and irreversibly kill someone's work. Instead,
container cleanup for abandoned sessions is handled separately by the
idle reaper below, which gives a grace period before removing anything.

### 10b. The idle reaper — what actually destroys an abandoned container

Early testing showed the gap this closes directly: the `beforeunload`
popup only *warns* the user — it doesn't call any cleanup API. Closing
a tab without clicking "End Session" left the container running
indefinitely (confirmed with `docker ps` showing containers still `Up`
after 40+ minutes with their tabs long closed).

```ts
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const REAPER_INTERVAL_MS = 60 * 1000;  // check once a minute
const connectedSessions = new Set<string>();

async function reapIdleSessions() {
  const idle = getIdleSessions(IDLE_TIMEOUT_MS);
  for (const { sessionId, containerId } of idle) {
    if (connectedSessions.has(sessionId)) continue; // still connected — never idle
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
    removeSession(sessionId);
  }
}

setInterval(() => { reapIdleSessions(); }, REAPER_INTERVAL_MS);
```

How the pieces fit together:
- `sessionStore.ts` now tracks `lastActiveAt` per session (not just
  `containerId`), plus `touchSession()` to reset it and
  `getIdleSessions(idleMs)` to find sessions older than a threshold.
- `connectedSessions` (a `Set`, held in `server.ts`) tracks which
  sessions currently have a live socket. The reaper skips anything in
  this set **no matter how old its timestamp is** — a session with an
  open tab that's just been quiet for a while must never be reaped,
  only one with *no connection at all*.
- On `terminal:join`, the session is added to `connectedSessions` and
  touched (clock reset).
- On `disconnect`, it's removed from `connectedSessions` and touched
  again — so the 5-minute countdown starts from the moment the
  connection actually ended, not from the last keystroke typed before
  it.
- Every 60 seconds, anything idle longer than 5 minutes with no active
  connection gets its container stopped, removed, and dropped from the
  session store.

This was verified with a temporarily shortened timeout (20 seconds) to
get a fast, unambiguous answer instead of waiting on a 5-minute test:
closing a tab produced a `[socket] client disconnected` log almost
immediately, followed roughly 20 seconds later by `[reaper] removed
idle session ... (container ...)`, confirmed by `docker ps` no longer
listing that container.

A small related fix along the way: `NodeJS.WritableStream`'s TypeScript
type doesn't declare a `destroy()` method even though it exists at
runtime on the actual stream object dockerode returns — hence the
`(shellStream as any).destroy()` cast. A type-definition gap, not a
runtime bug; worth being able to explain the distinction.

---

## 11. What's implemented vs. what isn't (say this honestly in an interview)

**Solidly implemented and demonstrable:**
- Custom Socket.IO + Next.js server sharing one HTTP server/port
- Session ID → container ID mapping, fixed for the dual-module-registry bug
- Persistent interactive `/bin/bash` exec per session (real shell state across commands)
- Manual Docker stream demuxing based on observed byte behavior
- Bidirectional input/output streaming
- Live terminal resize propagated to the container's pseudo-terminal
- Per-socket isolation via closure-scoped variables — verified with two
  simultaneous browser tabs, each producing a separate container with
  no file/command cross-contamination
- Automatic cleanup of abandoned containers via the idle reaper (closing
  a tab without clicking "End Session" now really does destroy the
  container, after a 5-minute grace period) — verified with `docker ps`
  before and after
- A `beforeunload` confirmation dialog warning the user before they
  leave (note: this is only a warning — see Section 10b for what
  actually performs cleanup)

**Acknowledged gaps (still worth naming honestly):**
- No authentication — any browser that can reach the backend can open a
  session and get an interactive root shell in a container. Fine for
  local development, not fine as-is for any real deployment.
- Session state (`sessionStore`) is in-memory and single-process — it
  resets on server restart and won't work if the backend were ever
  scaled to multiple instances without a shared store like Redis.

---

## 12. Interview Q&A cheat sheet

**Q: What is Socket.IO and why did you need it here?**
A library for persistent, bidirectional, event-based communication over
WebSockets. HTTP request/response can't keep a channel open for a
terminal session where either side needs to push data at any time —
Socket.IO gives that persistent channel, plus a simple event-based API
(`terminal:input`, `terminal:output`, `terminal:resize`) instead of
raw WebSocket message parsing.

**Q: What's the difference between `docker exec` and `docker attach`?**
`attach` connects to a container's existing main process (PID 1).
`exec` starts a brand-new process inside an already-running container.
This project uses `exec` to launch `/bin/bash` as a separate process
from the container's actual keep-alive command, so the shell has its
own lifecycle independent of whatever the container was originally
started with.


**Q: How do you know two sessions don't interfere with each other?**
Every per-connection state variable (`shellStream`, `exec`,
`currentSessionId`, `currentContainerId`) is declared inside the
`io.on("connection", (socket) => {...})` closure, not at module scope.
JavaScript closures give each invocation of that callback (i.e., each
socket) its own private copies, so there's no shared mutable state
between different users' sessions at the socket-handling layer.

**Q: Why was a custom server needed instead of just using Next.js?**
Next.js App Router API routes are request/response handlers — they
can't hold a WebSocket connection open. Socket.IO needs a raw
`http.Server` instance to attach itself to. The custom `server.ts`
wraps Next's request handler inside a plain HTTP server, then attaches
Socket.IO to that same server, so one process serves both the existing
REST API routes and the new WebSocket traffic.

**Q: Walk me through what happens end-to-end when I type `ls` and press Enter.**
1. xterm.js fires `term.onData("l")`, `"s"`, `"\r"` as you type
2. Each keystroke is emitted immediately as `terminal:input` over the socket
3. The backend writes each character straight to `shellStream` (the
   exec'd bash process's stdin) — no buffering or command batching
4. Bash echoes each character back as it receives it, and on Enter,
   actually runs `ls` and writes its output to stdout
5. That output arrives at the backend as one or more raw chunks,
   framed with Docker's stdcopy header
6. `demuxDockerStream` strips the framing and passes clean text to a callback
7. That callback does `socket.emit("terminal:output", text)`
8. `Terminal.tsx`'s listener calls `term.write(text)`, and xterm.js
   renders it — including ANSI color codes for a colorized listing

**Q: What was the hardest bug and how did you find it?**
The session lookup failing right after creation ("unknown session")
despite the session definitely being created — traced to the same
source file being loaded into two separate module registries (Next's
bundler for API routes vs. `tsx` for the custom server), so each had
its own copy of the in-memory `Map`. Fixed by pinning the map to
`globalThis`.

**Q: What happens if a user just closes the tab instead of clicking "End Session"?**
The `beforeunload` handler shows a warning popup, but that's only a
warning — closing the tab still severs the socket, which triggers the
backend's `disconnect` handler. That frees the shell stream/exec
immediately, but deliberately does *not* kill the container right away
(to survive brief network blips without destroying work). Instead, the
session's idle clock starts from that disconnect moment, and a
background reaper checks once a minute for sessions idle longer than 5
minutes with no reconnected socket — those get their container stopped
and removed automatically. So cleanup is delayed and grace-period-based
rather than instant, on purpose.

**Q: How do you know the reaper doesn't kill an actively-connected-but-quiet session?**
A `connectedSessions` Set tracks every session with a currently live
socket, updated on join/disconnect. The reaper explicitly skips
anything in that set before even checking its timestamp — so a session
can sit idle (no typing) for hours with the tab still open and never be
touched; only a session with *zero* connection for the full timeout
window gets reaped.
