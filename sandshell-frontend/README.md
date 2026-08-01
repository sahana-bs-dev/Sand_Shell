# SandShell — Frontend (Phase 1)

Frontend-only build of SandShell: a browser-based Ubuntu sandbox. This phase
contains **no backend, no Docker, and no real API calls** — session state is
fully mocked so it's easy to wire into the real backend later.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React icons

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Structure

```
public/
  images/          static images (empty for now)
  icons/           favicon.svg
  logo.svg         navbar logo mark

src/
  app/
    page.tsx        landing page (Hero, Features, How it works, Footer)
    layout.tsx       root layout — fonts + metadata
    globals.css      Tailwind entry
    loading.tsx      App Router Suspense fallback (route-level, see note below)
    session/
      page.tsx       /session route

  components/
    Navbar.tsx
    Hero.tsx
    FeatureCard.tsx
    Footer.tsx
    LoadingScreen.tsx
    SessionCard.tsx
    StartButton.tsx
    EndButton.tsx

  hooks/
    useSession.ts    local-only mock session state

  styles/
    animations.css   custom keyframes (ripple, blinking caret)

  utils/
    cn.ts            small classnames merge helper

  types/
    session.ts        shared SessionStatus type
```

## What's mocked (to replace in the next phase)

- `handleStart` in `src/app/page.tsx` — currently a 5s `setTimeout` before
  navigating to `/session`. Replace with `POST /session/start`.
- `useSession` in `src/hooks/useSession.ts` — currently toggles
  `offline → connecting → online` locally. Replace with real state driven
  by `GET /health`, `POST /session/start`, and `DELETE /session/end`.

### A note on `app/loading.tsx`

Next's App Router shows this automatically as a Suspense fallback while a
route segment is loading (e.g. when a Server Component is awaiting data).
It does **not** fire for the button-click "Creating Secure Ubuntu
Environment..." flow on the landing page — that's client-side state, and
is handled directly in `app/page.tsx` via `LoadingScreen`. Once `/session`
fetches real data from the backend, `loading.tsx` will kick in automatically
for that transition too.

## Design tokens

| Token        | Value     |
| ------------ | --------- |
| Background   | `#0D1117` |
| Card         | `#161B22` |
| Accent Blue  | `#58A6FF` |
| Accent Green | `#3FB950` |
| Danger       | `#F85149` |

Fonts: Inter (UI) + JetBrains Mono (terminal/code/labels).
