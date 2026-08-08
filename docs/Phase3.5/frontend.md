# 3. Frontend, In Detail

## 3.1 Setup

```
cd sandshell-frontend
npm install
npm run dev
```

Starts on port 3000. Needs the backend running on port 3001 too — sessions, the terminal, and file save/read all depend on it.

## 3.2 Frontend packages

| Package | Purpose |
|---|---|
| `next` | Routing, rendering, project structure. |
| `react`, `react-dom` | The core UI library Next.js is built on. |
| `@monaco-editor/react` | The actual code editor — same engine VS Code uses. |
| `@xterm/xterm`, `@xterm/addon-fit` | Renders the terminal in the browser and resizes it to fit. |
| `socket.io-client` | Keeps a live, two-way connection to the backend for the terminal. |
| `axios` | One-off HTTP requests — save file, read file, start/end session. |
| `lucide-react` | Icons (Save, Run, close-tab X, etc.). |
| `framer-motion` | Animations — loading spinner, homepage fade-ins. |
| `tailwindcss` | Styling. |

Rule of thumb used throughout the app: `axios` is for something that happens once and gets one response; `socket.io-client` is for continuous, real-time streaming.

## 3.3 The three main pieces

**`SessionContext.tsx`** — "is there a session, and what's its ID"
Holds `sessionId` and `status` (`offline` / `connecting` / `online` / `ending`) in React Context, so the homepage and the `/session` page both read and write the same state instead of each keeping a disconnected copy. `startSession()` calls `POST /api/session/start`; `endSession()` calls `DELETE /api/session/end`.

**`SessionContent.tsx`** — the traffic controller
The main component for `/session`. It owns:
- `tabs` — the list of currently open editor files.
- `activeTabId` — which tab is focused.
- `activeView` — whether the terminal or the editor is currently visible.

Important design choice: both `Terminal` and `CodeEditor` stay mounted in memory the entire time — switching between them just hides/shows one with CSS (a "hidden" class), never unmounting either. This matters for two reasons: the terminal's live socket connection never drops just because the editor was opened, and any unsaved code in an editor tab never gets lost just because the view switched back to the terminal.

When `sessionId` changes (a session ends, or a new one starts), all open tabs get wiped — they'd otherwise be pointing at files inside a container that no longer exists.

**`CodeEditor.tsx`** — the editor itself
Wraps Monaco and adds a tab strip (multiple files open at once, each with its own filename, content, and a dirty-indicator dot for unsaved changes), plus Save and Run buttons, plus a "← Terminal" button.

- **Save** → `axios.post()` sends `{ sessionId, fileName, content }` to `/api/editor/save`.
- **Run** → looks at the file extension and builds the matching shell command (`gcc file.c -o file && ./file` for `.c`, `python3 file.py` for `.py`, `node` for `.js`, etc.), then hands that command up to `SessionContent`, which sends it through the socket connection the terminal already has open — so it runs exactly as if it had been typed into the terminal, and the view automatically switches to the terminal to show the output.

## 3.4 How a file actually gets opened — the "gedit trick"

There's no `gedit` installed inside the sandbox container. Instead, `Terminal.tsx` watches every keystroke sent to the shell. The check is a single regular expression:

```javascript
const match = trimmed.match(/^(?:gedit|nano|vim|vi)\s+(\S+)/);
```

Read plainly: it only matches when the line starts with one of those four words (`gedit`, `nano`, `vim`, or `vi`), followed by a space, followed by a filename. It's pattern-matching the command, not the filename — so a bare filename typed on its own does nothing special.

| You type | Editor opens? | Why |
|---|---|---|
| `gedit program.c` | Yes | Matches `gedit` + space + filename |
| `nano program.c` | Yes | Matches `nano` + space + filename |
| `program.c` | No | Doesn't start with gedit/nano/vim/vi — sent straight to the real shell, which reports "command not found" |
| `cat program.c` | No | `cat` isn't in the matched list — runs for real, prints the file to the terminal |
| `vim program.c` | Yes | Matches |

When a match happens (typing `gedit foo.c` and pressing Enter, for example):

- `Terminal.tsx` catches the line before it's actually run.
- It sends `Ctrl+U` to the container's shell — this clears that half-typed command from the shell's input line, so the container never tries (and fails) to run a program called `gedit`.
- It normalizes the filename — `foo.c` becomes `/root/foo.c` (files always live under `/root` in these containers) — and calls `onOpenEditor(fileName)`.
- That bubbles up to `SessionContent.handleOpenEditorFromTerminal`, which calls `GET /api/editor/read` to fetch the file's current content (or starts a blank tab if the file doesn't exist yet), opens a new tab with it, and switches `activeView` to `"editor"`.

From the user's point of view it looks like `gedit` opened a real editor — but it's entirely a frontend interception, not anything running inside the container. Commands like `rm program.c` or `python3 program.c` are untouched by this check and run for real.

## 3.5 Full data flow — Save & Run

- Typing in Monaco → `onChange` updates that tab's content in React state, marks it dirty.
- Click Save → `axios.post()` → backend writes it into the container's real filesystem (via the tar-archive builder in Section 2.4).
- Click Run → frontend builds the shell command → sent over the same Socket.IO channel the terminal uses → output streams back live into `Terminal.tsx`.

## 3.6 Next.js + React — why "use client" is everywhere

Mental model: React gives components, JSX, and hooks. Next.js decides where each component is allowed to run — on the server (default, no directive) or in the browser (`"use client"` at the top of the file).

**Server Components (default)**
Render once into HTML on the server, then that HTML is sent to the browser. After that there's no live JavaScript running for them at all — they can't use `useState`, can't handle clicks, can't use `useEffect`, because the server has already finished and moved on.

**Client Components (`"use client"`)**
Ship real JavaScript to the browser and behave like normal React, staying alive after the page loads — state, effects, event handlers, all of it.

Why almost every file in this frontend needs `"use client"`:

- `Terminal.tsx`, `CodeEditor.tsx` — xterm and Monaco both need a real browser DOM to mount into; neither can run on a server at all.
- `SessionContent.tsx` — uses `useState` for tabs, `useEffect` to react to `sessionId` changing.
- `SessionContext.tsx` — uses React Context (`createContext` / `useContext`), which only makes sense for a live, running app in the browser.

One-line summary: anything interactive, or anything using a browser-only library, must be explicitly marked `"use client"` — everything else defaults to the server. A mostly-static project (a blog, a marketing page) would flip this ratio, with `"use client"` only on the one button that needs a click handler; SandShell is almost entirely interactive, so almost everything here needs it.

