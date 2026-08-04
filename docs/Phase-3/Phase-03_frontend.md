# Phase 03 — Browser Terminal (Frontend Work)

## Goal
Build a real, working terminal interface in the browser — replacing the old mock terminal that only ever showed "command not found" — so it can eventually display real output from the Ubuntu container.

---

## What had to be done (as per roadmap, this phase's role-swap)

- Build the xterm.js terminal interface
- Handle user input (typing) inside the terminal
- Handle resizing so the terminal fits its container correctly
- (Backend counterpart, done by teammate: Socket.IO + node-pty connected to the Ubuntu container — still pending)

---

## Packages installed (in sandshell-frontend)

- `@xterm/xterm` — the core terminal rendering library; renders a genuine terminal (cursor, text, colors), not a styled fake div
- `@xterm/addon-fit` — addon that automatically resizes the terminal to fit its container, and handles window resize events
- `socket.io-client` — connects the frontend to the backend's Socket.IO server, for real-time two-way communication (sending keystrokes out, receiving command output back)

---

## What changed in sandshell-frontend

### `src/components/Terminal.tsx` — fully rebuilt

- Replaced the old mock terminal (fake `command not found` responses) with a real `xterm.js` instance
- On mount, creates the terminal, loads the fit addon, and opens it inside a container div
- Connects to the backend via Socket.IO (`http://localhost:3001`)
- `term.onData(...)` — captures every keystroke the user types and sends it to the backend, tagged as `terminal:input`
- `socket.on("terminal:output", ...)` — listens for output sent back from the backend and writes it directly into the terminal
- Automatically re-fits terminal size on window resize, and again whenever the terminal becomes active/visible
- Cleans up properly on unmount — disconnects the socket and disposes the terminal instance, so no dangling connections are left behind
- Wrapped the terminal in a styled card: title bar with red/yellow/green dots and a label (`ubuntu@sandshell — 80x24`), matching the app's existing visual design

### `src/components/SessionContent.tsx` — small but important fix

- The terminal component was previously always mounted, even before a session started — meaning it tried to connect to the backend immediately on page load, before Docker had even created a container
- Fixed by only rendering `<Terminal />` when `status === "online"` — so the terminal (and its socket connection) doesn't exist at all until the user clicks Start and a real session is active
- As a side effect, this also means the terminal cleanly disconnects and unmounts when the session ends, instead of lingering

### `src/types/css.d.ts` — new file, **unrelated to logic**

- Added a type declaration (`declare module "*.css";`) to resolve a TypeScript warning about importing xterm's CSS file (`@xterm/xterm/css/xterm.css`) from inside node_modules — purely a type-checking fix, no functional effect

---

## Current state 

**Works right now:**
- Real xterm.js terminal renders correctly, styled with a proper border and title bar
- Terminal only appears after a session is started (status is "online")
- Resizing works correctly, both on window resize and when the terminal becomes visible
- Frontend attempts a real Socket.IO connection to the backend on port 3001
