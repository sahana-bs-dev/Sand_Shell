# Phase 01 — Backend Work

## Goal
Prove frontend and backend can actually talk to each other before building any real features.

---

## Why /health is used

- Not a real SandShell feature — just a connectivity check
- Answers one question only: "Is the backend alive and reachable?"
- Standard practice: almost every backend has a /health route
- Keeps integration bugs (wrong port, server down, CORS) separate from real feature bugs
- Backend runs on port 3001, frontend on port 3000

---

## How CORS is implemented

- Problem: Frontend (3000) and backend (3001) are different origins — browsers block cross-origin responses by default (Same-Origin Policy)
- Fix: Backend explicitly allows the frontend's origin via response headers
- Implemented in two places for safety:
  - A middleware file that applies CORS headers to all /api/* routes automatically
  - The same headers also added directly inside the /health route itself, as backup
- Two parts handle this:
  - GET — the real request, returns the actual health status
  - OPTIONS — handles the browser's automatic "preflight" check that happens silently before the real request, to confirm the origin is allowed
- If CORS headers are missing: backend still processes the request successfully (200 OK), but the browser blocks the frontend from reading the response — shows up as a CORS error in console

---

## What changed on the frontend

- Only one file needed changes: the useSession hook
- No UI components were touched (buttons, cards, terminal all stayed the same)
- Before: Start Session used a fake timer — always switched to "Online" after ~1.4 seconds, no real check
- After: Start Session now makes a real call to the backend's /health endpoint
  - If backend responds successfully, status becomes "Online"
  - If backend is unreachable or down, status falls back to "Offline"
- Status message text updated to remove "mock" wording now that it's a real check
- This was possible with one file change because the hook was intentionally built to isolate all backend-calling logic — UI components just consume the result, regardless of whether it's fake or real

---

## How it was tested

- Ran both servers, clicked Start Session, confirmed "Online" status, request visible in Network tab, no console errors
- Stopped the backend server, clicked Start Session again, confirmed status correctly dropped to "Offline" — proof the check is real, not hardcoded

---

## What's still fake (for later phases)

- Ending a session doesn't call the backend yet — just resets frontend state
- The terminal doesn't run real commands yet — no Docker, no live shell
- No live streaming connection (Socket.IO) exists yet
- These will be replaced the same way /health was — swap fake logic for real backend calls, phase by phase



## Changes done in files 
- In sandshell-backend
- "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  }
- Added src/app/api/health/route.ts -------> For testing purpose only
- Modified sandshell-frontend/src/hooks/useSession.ts
