# Phase 02 — Docker Integration (Backend Work)

## Goal
Replace the fake/mock session (from Phase 1) with a real Ubuntu Docker container — actually creating and destroying a container when a user starts/ends a session, instead of just checking if the backend is alive.

---

## What had to be done (as per roadmap)

- Implement POST /session/start — create and start a real Ubuntu container
- Implement DELETE /session/end — stop and remove that container
- Integration: clicking Start should create a real container; clicking End should destroy it
- Testing: verify with `docker ps` that containers actually start and stop

---

## Environment setup done before any coding

- Installed WSL2 (Windows Subsystem for Linux) — required because Docker containers are Linux processes, and Windows needs a real Linux kernel underneath to run them
- Installed Docker Desktop, enabled WSL integration for the Ubuntu distro
- Verified Docker was working using `docker ps` (empty table = healthy, no errors)
- Pulled the Ubuntu image locally (`docker pull ubuntu`) so containers could be created from it without a delay on first use

---

## Packages installed (in sandshell-backend)

- `dockerode` — the library that lets Node.js/Next.js code talk to the Docker engine programmatically (create, start, stop, remove containers) instead of using Docker CLI manually
- `@types/dockerode` — TypeScript type definitions for Dockerode, since Dockerode itself is plain JavaScript with no built-in types

---

## Backend files created

- **`src/lib/docker.ts`** — sets up a single shared Dockerode connection to the local Docker engine, reused across routes
- **`src/lib/sessionStore.ts`** — a simple in-memory map that links a generated `sessionId` to the real Docker `containerId`, so the app knows which container belongs to which session. Resets if the server restarts — acceptable for practice-scale, not for production
- **`src/app/api/session/start/route.ts`** — POST route:
  - Creates a new Ubuntu container using Dockerode (kept alive with a background command)
  - Starts the container
  - Generates a unique `sessionId`, stores it alongside the real `containerId`
  - Returns `{ status, sessionId, containerId }` to the frontend
  - Includes CORS headers so the frontend origin is allowed to read the response
- **`src/app/api/session/end/route.ts`** — DELETE route:
  - Accepts a `sessionId` in the request body
  - Looks up the matching `containerId` from the session store
  - Stops and removes that container via Dockerode
  - Clears the session from the in-memory store
  - Includes CORS headers, same as above

---

## What changed on the frontend

- Only one file modified: **`src/hooks/useSession.ts`** (no UI component files touched, same pattern as Phase 1)
- Added a new piece of state: `sessionId`, to remember which session/container is active between the Start and End clicks
- `startSession()` — now calls `POST /api/session/start` instead of the old `/api/health` check; stores the returned `sessionId`; sets status to "online" only if the backend confirms success
- `endSession()` — now calls `DELETE /api/session/end`, sending the stored `sessionId`; resets state back to "offline" once done, even if the request fails, so the UI never gets stuck
- Added a new session status, `"ending"`, with its own message ("Please wait, ending your session...") — shown while the container is being stopped, since Docker's stop operation isn't instant
- Also updated `src/types/session.ts` to include `"ending"` as a valid status value

---

## Full flow of work (end to end)

1. User clicks **Start Session** in the browser
2. Frontend calls `POST /api/session/start`
3. Backend uses Dockerode to create and start a real Ubuntu container
4. Backend generates a `sessionId`, links it to the real container ID, returns both to frontend
5. Frontend stores the `sessionId`, updates status to "online"
6. `docker ps` on the machine now shows the real container running — confirms it's genuine, not simulated
7. User clicks **End Session**
8. Frontend immediately shows "ending" status, calls `DELETE /api/session/end` with the stored `sessionId`
9. Backend looks up the container by `sessionId`, stops and removes it via Dockerode
10. Frontend resets state back to "offline" once the request completes
11. `docker ps` now shows an empty table again — confirms the container was actually destroyed, not just marked as done in the UI

---
