# ACTORVERSE — Phase 1

Actor training app, rebuilt as an ordinary web app (Next.js + TypeScript +
Supabase). Brand: **ACTORVERSE** — *"Train Like an Athlete. Perform Like a
Legend."* Black + gold theme, simple plain English, mobile-first.

> Note: this repo also hosts the ACTORVERSE Privacy Policy as `index.html`
> at the repo root (served via GitHub Pages) — that file is separate from
> the app code below and must not be deleted.

## Phase 1 scope

- **Landing page** (`/`) — hero, stats, sign in / sign up.
- **Exercise library** (`/exercises`) — 170 exercises across 10 departments,
  department filter chips, exercise cards, "Start with timer" sends the
  exercise to the timer.
- **Practice timer** (`/timer`) — presets 1 / 2 / 5 / 10 / 15 min, start /
  pause / reset. When the timer finishes it logs a session to Supabase (only
  when signed in; otherwise it shows a note that signing in saves sessions).
- **Analytics** (`/analytics`, requires sign-in) — 7-day and 30-day bar charts
  of practice minutes, weekly goal setter (saved to Supabase), per-department
  progress bars, recent sessions list, total minutes + streak.
- **Auth** — Supabase Auth, email + password sign up / sign in / sign out.

## What is NOT included in Phase 1

- No recording (no Teleprompter Recorder, no Voice/Camera Studios)
- No Script Vault
- No Admin Panel
- No AI Coach
- No payments / subscriptions
- No monologues, training plans, or achievements (those belong to later phases)

## Exercise library — source note

The library has **170 exercises** across 10 departments:

| Department | Count |
| --- | --- |
| Voice | 18 |
| Body | 20 |
| Emotion | 18 |
| Imagination | 16 |
| Camera | 18 |
| Audition | 18 |
| Dialect | 14 |
| Movement | 16 |
| Mind | 16 |
| Career | 16 |

**18 titles are verbatim from the original app's static demo export**
(`actorverse-static-demo.html`) — same titles, descriptions, minutes and
levels. The remaining 152 exercises were recreated in the same style (title,
one-sentence description, 2–15 minutes, Beginner / Intermediate / Advanced)
to complete the 170-exercise library. See `src/data/exercises.ts`.

## Setup

### 1. Create a free Supabase project

Go to [supabase.com](https://supabase.com), create a free project, and copy
its **Project URL** and **anon public key** from Settings → API.

### 2. Run the schema

In the Supabase Dashboard, open **SQL Editor → New query**, paste the whole
of `supabase/schema.sql`, and run it. This creates three tables — `profiles`,
`sessions`, `weekly_goals` — and enables Row Level Security so users can only
read and write their own rows.

### 3. Set the environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local` with your own project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Never commit `.env.local` or any real keys. `.env.example` contains
placeholders only.

### 4. Run locally / deploy on Vercel

```bash
npm install
npm run dev        # local development at http://localhost:3000
npm run build      # production build check
```

To deploy: push this folder to a GitHub repo, then in Vercel choose
**Add New → Project → Import** that repo, add the two environment variables
above, and deploy. No other settings are needed.

## Project structure

```text
src/
  app/
    layout.tsx          # header/nav, footer, global styles
    page.tsx            # landing page + sign in/up
    globals.css         # black + gold theme
    exercises/page.tsx  # exercise library with filters
    timer/page.tsx      # practice timer, logs sessions on finish
    analytics/page.tsx  # charts, goal, per-department progress, sessions
  components/
    AuthForm.tsx        # sign up / sign in form
    SignOutButton.tsx   # sign out
    GoalSetter.tsx      # weekly goal form (saved to Supabase)
  data/
    exercises.ts        # the 170-exercise library
  lib/
    supabase.ts         # browser + server Supabase clients
supabase/
  schema.sql            # profiles, sessions, weekly_goals + RLS policies
```

## Tech

- Next.js 14 (App Router) + React 18 + TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Auth + Postgres
- No other services. No real API keys are stored in this repo.
