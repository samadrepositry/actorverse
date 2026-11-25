# ACTORVERSE — Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5

Actor training app, rebuilt as an ordinary web app (Next.js + TypeScript +
Supabase). Brand: **ACTORVERSE** — *"Train Like an Athlete. Perform Like a
Legend."* Black + gold theme, simple plain English, mobile-first.

> Note: this repo also hosts the ACTORVERSE Privacy Policy as `index.html`
> at the repo root (served via GitHub Pages) — that file is separate from
> the app code below and must not be deleted.

## Navigation + theme (2026-11-25 update)

- **Sidebar navigation** (`src/components/Sidebar.tsx`): fixed left sidebar
  on desktop, slide-in drawer with a hamburger top bar on mobile. Order:
  Dashboard, Exercises, Timer, Teleprompter, Studio, Scripts, Monologues,
  Plans, AI Coach, Analytics, Achievements, Community, Auditions, then
  Admin under a divider, Sign out pinned at the bottom. Active page is
  highlighted in gold.
- **Color refresh**: same black + gold identity, now premium — deeper warm
  near-black surfaces, a warm gold gradient on headings, buttons, progress
  bars and active states, soft shadows on cards.
- **Auth / email links** (`src/app/auth/callback/route.ts`): sign-up
  confirmation and password-reset emails link to `/auth/callback`, which
  exchanges the Supabase code for a session and sends the user to the
  Dashboard (or to `/auth/reset-password` for recovery links). Sign-up
  passes `emailRedirectTo` to the live site, so links never point at
  localhost. Signing up with an already-registered email shows a plain
  message with Sign in / Reset password options, and the sign-in form has
  a "Forgot password?" flow. Requires the Supabase dashboard **Site URL**
  to be `https://actorverse.vercel.app` (and that URL in Redirect URLs).

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

- No Script Vault
- No Admin Panel
- No AI Coach
- No payments / subscriptions
- No training plans or achievements (those belong to later phases)

## Phase 3 scope

- **Script Vault** (`/scripts`) — private PDF scripts, PDF only, about
  10 MB max; view, download, rename, delete. An optional pasted script
  text can be sent to the Teleprompter. Files live in the private
  `scripts` Storage bucket, rows in the `scripts` table (own rows only).
- **Monologues** (`/monologues`) — all 14 original monologues, read here
  or sent to the Teleprompter (`/teleprompter?monologue=<id>`).
- **Training Plans** (`/plans`) — 7 built-in plans plus a custom plan
  builder (department, minutes/day, weeks). Enrolling is free (Rs 0) and
  saved server-side in the `enrollments` table.

### Phase 3 setup (after the Phase 1 + 2 steps)

Run these files once in the Supabase SQL Editor:

1. `supabase/migrations/0007_scripts.sql` — creates the `scripts` table.
2. `supabase/migrations/0008_enrollments.sql` — creates the `enrollments`
   table.
3. `supabase/storage-scripts-bucket.sql` — creates the private `scripts`
   bucket and its storage policies. The app cannot create the bucket
   itself; this step needs the project owner.
4. Or re-run the full `supabase/schema.sql`, which now includes all of
   the above (but not the bucket — that still needs step 3).

## Phase 4 scope

- **AI Coach** (`/coach` + `/api/coach`) — chat with an acting coach in
  English or Urdu, powered by Gemini on the server
  (`GEMINI_API_KEY`, see `.env.example`). If no key is set, the Coach
  honestly says it is not connected yet — it never fakes an answer.
- **Achievements** (`/achievements`) — 8 badges computed ONLY from the
  user's real practice data (sessions, minutes, streak, departments).
  No fake numbers.
- **Community** (`/community`) — short posts (max 500 characters),
  newest first, signed-in users only. Starts empty.
- **Audition Center** (`/auditions`) — audition listings anyone signed
  in can post, one application per user per audition; owners can read
  the applications on their own listings. Starts empty.

### Phase 4 setup

Run these files once in the Supabase SQL Editor (or re-run the full
`supabase/schema.sql`):

1. `supabase/migrations/0009_posts.sql` — creates the `posts` table.
2. `supabase/migrations/0010_auditions.sql` — creates the `auditions`
   and `applications` tables.
3. For the AI Coach, add `GEMINI_API_KEY` to `.env.local` (local) and
   as a Vercel environment variable (live). Without it the Coach shows
   its honest "not connected yet" state.

## Phase 5 scope

- **Admin Panel** (`/admin`) — first-run Super Admin bootstrap: the
  FIRST user to complete admin setup becomes Super Admin (the owner
  must do this first, before sharing the app). Roles: Super Admin /
  Content Manager / Support Manager / Moderator. Admins see real counts
  (users, sessions, takes, scripts, posts, auditions, enrolments) and
  manage roles. Removing the last Super Admin is blocked.
- **Subscriptions** — Free Mode is ON by default (everything free,
  Rs 0). Pro Rs 12,000/year and Premium Rs 24,000/year are stored
  settings the Super Admin can edit; a toggle switches paid plans back
  on. There is NO payment gateway and NO charging anywhere.

### Phase 5 setup

Run `supabase/migrations/0011_admin.sql` once in the Supabase SQL
Editor (or re-run the full `supabase/schema.sql`). It creates the
`admin_roles` and `app_settings` tables, the `is_super_admin()`
helper, the admin policies, and the default settings (Free Mode on,
Pro 12000, Premium 24000).

## Phase 2 scope

- **Teleprompter** (`/teleprompter`) — 6 original monologues or paste your
  own text; scroll speed (10–120 px/s) and text size controls; big red
  RECORD button (one tap starts camera + script scroll together, second
  tap STOP & SAVE); Wide / Medium / Close-up framing (hardware camera zoom
  where the phone supports it, otherwise a centre-cropped recording so the
  saved video matches the preview); front/back camera toggle; picture
  prompt (upload a picture, pinned over the camera view).
- **Studio** (`/studio`) — Camera Studio (preview, framing, record/stop)
  plus My Private Recordings (play, Save to phone, delete).
- **Recording** — prefers MP4 where the browser supports it, 720p, capped
  bitrate; takes over 50 MB are not uploaded (still downloadable); plain
  language errors, never cryptic ones.
- **Storage** — takes upload to the private `recordings` Supabase Storage
  bucket with one row in the `recordings` table (own rows only).

### Phase 2 setup (after the Phase 1 steps)

Run these two files once in the Supabase SQL Editor:

1. `supabase/migrations/0006_recordings.sql` — creates the `recordings`
   table (or re-run the full `supabase/schema.sql`, which now includes it).
2. `supabase/storage-recordings-bucket.sql` — creates the private
   `recordings` bucket and its storage policies. The app cannot create the
   bucket itself; this step needs the project owner.

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
of `supabase/schema.sql`, and run it. This creates eleven tables —
`profiles`, `sessions`, `weekly_goals`, `recordings`, `scripts`,
`enrollments`, `posts`, `auditions`, `applications`, `admin_roles`,
`app_settings` — and enables Row Level Security so users can only read and
write their own rows. Then run the two bucket files once (they cannot be
created by the app): `supabase/storage-recordings-bucket.sql` (Phase 2) and
`supabase/storage-scripts-bucket.sql` (Phase 3).

### 3. Set the environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local` with your own project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
# Optional (AI Coach, Phase 4) — server only, never in client code:
GEMINI_API_KEY=your-gemini-api-key-here
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
    teleprompter/page.tsx # monologues, script scroll, record
    studio/page.tsx     # camera studio + private recordings
    scripts/page.tsx    # Script Vault (PDFs)
    monologues/page.tsx # 14-monologue library
    plans/page.tsx      # 7 plans + custom builder, enrolments
    coach/page.tsx      # AI Coach chat (English/Urdu)
    api/coach/route.ts  # Gemini server route (key never in browser)
    analytics/page.tsx  # charts, goal, per-department progress, sessions
    achievements/page.tsx # badges from real practice data
    community/page.tsx  # posts board
    auditions/page.tsx  # audition listings + applications
    admin/page.tsx      # Super Admin bootstrap, roles, settings
  components/
    AuthForm.tsx        # sign up / sign in form
    SignOutButton.tsx   # sign out
    GoalSetter.tsx      # weekly goal form (saved to Supabase)
  data/
    exercises.ts        # the 170-exercise library
    monologues.ts       # 14 original teleprompter monologues
    plans.ts            # 7 training plans
  lib/
    supabase.ts         # browser + server Supabase clients
    recorder.ts         # camera, framing, MP4/WebM recording helpers
    useRecorder.ts      # shared camera + recording state
    recordings.ts       # Storage upload + recordings table helpers
    scripts.ts          # Script Vault helpers
    plans.ts            # plan enrolment helpers
    achievements.ts     # badges from real sessions
    community.ts        # posts + auditions helpers
    admin.ts            # admin roles + settings helpers
supabase/
  schema.sql            # all 11 tables + RLS (Phases 1–5)
  migrations/0006_recordings.sql   # Phase 2 recordings table (standalone)
  migrations/0007_scripts.sql      # Phase 3 scripts table
  migrations/0008_enrollments.sql  # Phase 3 enrolments table
  migrations/0009_posts.sql        # Phase 4 posts table
  migrations/0010_auditions.sql    # Phase 4 auditions + applications
  migrations/0011_admin.sql        # Phase 5 admin roles + settings
  storage-recordings-bucket.sql   # private `recordings` bucket + policies
  storage-scripts-bucket.sql      # private `scripts` bucket + policies
```

## Tech

- Next.js 14 (App Router) + React 18 + TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Auth + Postgres
- No other services. No real API keys are stored in this repo.
