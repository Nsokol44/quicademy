# Quicademy — MVP

> Warm, mentor-like trade education platform powered by AI + vetted human experts.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + API routes | Next.js 14 (App Router) |
| Styling | Tailwind CSS — violet + solar yellow design system |
| Backend / DB | Supabase (Postgres + Auth + Realtime) |
| AI (live room) | Anthropic Claude API (claude-sonnet-4) |
| Deployment | Vercel |

---

## Pages Built

| Route | Description |
|---|---|
| `/` | Marketing landing page with value props + CTAs |
| `/auth/register` | Student + Instructor registration (multi-step) |
| `/auth/login` | Sign in |
| `/auth/callback` | Supabase OAuth callback handler |
| `/onboarding` | 4-step learning profile assessment |
| `/dashboard` | Student dashboard — enrollments, live rooms, suggestions |
| `/courses` | Course browser with category + level filters |
| `/instructor` | Instructor portal — overview, courses, live rooms, profile |
| `/instructor/import` | Import a course from a CourseForge .zip export |
| `/instructor/import/pdf` | Generate a course from a PDF via Gemini (AI) |
| `/instructor/pending` | Application under review page |
| `/live-room/[id]` | Real-time AI + expert + student chat room |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd quicademy
npm install
```

### 2. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase_schema.sql`
   *(note: this file isn't actually in the repo — the base schema was applied
   directly at some point and never exported back. `supabase_migration_combined.sql`
   has everything that *is* captured here on top of that base schema.)*
3. In **Authentication → URL Configuration**, add:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the three environment variables when prompted. Update `NEXT_PUBLIC_SITE_URL` to your Vercel domain.

Also update Supabase Auth redirect URLs to include your production domain.

---

## Key Architecture Decisions

### Auth Flow
1. User registers → Supabase trigger auto-creates `profiles` row
2. Student → `/onboarding` (4-step profile) → `/dashboard`
3. Instructor → `/instructor/pending` (awaiting admin approval)

### Live Room AI
The live room calls the Anthropic API directly from the client using the public anon key pattern. For production, move this to a Next.js API route to protect your API key:

```
/src/app/api/ai/route.js  ← create this to proxy Anthropic calls
```

### Realtime
Supabase Realtime subscriptions on `room_messages` power the live chat. Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages` in the schema.

---

## Next Steps (Post-MVP)

- [ ] Course detail page (`/courses/[id]`)
- [ ] Module content player with progress tracking  
- [ ] Enrollment flow + Stripe payments
- [ ] Employer dashboard (`/employer`)
- [ ] Admin panel for instructor approval
- [ ] Spaced repetition / review engine
- [ ] Video upload via Mux or Cloudflare Stream
- [ ] Push notifications for live room schedules
- [ ] Move AI calls to server-side API route

---

## Generate course from PDF + daily SMS reminders

Two additions on top of the existing platform:

**Generate course from PDF** (`/instructor/import/pdf`) — an instructor uploads a PDF,
Gemini reads it and returns a day-by-day curriculum (steps, "done when" criteria, recall
prompts, a troubleshooting table), and the instructor previews/edits category+level
before it's created as a draft course. It reuses `GEMINI_API_KEY` (already required for
`/api/ai`) — no new AI key needed. **No schema change either**: it writes into the
existing `courses` / `sections` / `modules` tables the same way `/instructor/import`
(CourseForge) does — one section per day, one module per step, so per-step completion
rides the existing `module_progress` table for free. Troubleshooting + hotkeys land in
one trailing reference module.

**Daily SMS reminders** (Settings → Notifications) — a student adds a phone number and
flips a per-course toggle; once a day a Vercel Cron job texts them their next unfinished
lesson, its recall prompt, and the next couple of steps. This one *does* need new
infrastructure the app didn't have before:

1. **Run `supabase_migration_combined.sql`** in the Supabase SQL editor — this single
   file combines the press, production-hardening, and reminders migrations
   (idempotent throughout: safe to run even if some/all of it is already applied,
   since every statement uses `IF NOT EXISTS`/`IF EXISTS`/drop-then-recreate). It adds
   `profiles.phone`, `enrollments.sms_reminders_enabled`, `enrollments.reminder_last_sent_at`
   among everything else already in those three files. (`supabase_migration_press.sql`,
   `supabase_production_hardening.sql`, and `supabase_migration_reminders.sql` are kept
   for reference but you no longer need to run them separately — the combined file
   supersedes all three.)
2. **Add `SUPABASE_SERVICE_ROLE_KEY`** (Project Settings → API in Supabase). The cron
   route needs it to read across all students' reminder settings — the app has no
   service-role usage anywhere else today, so this is new.
3. **Twilio** — create an account, get a number, set `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. **If texting US numbers, register for A2P
   10DLC** in the Twilio console — unregistered long-code traffic gets filtered/blocked
   by carriers within days, this isn't optional past a quick test.
4. **`CRON_SECRET`** — any random 16+ character string, set in Vercel's project env
   vars. Vercel sends it automatically as the `Authorization` header when the cron
   fires; `vercel.json` already schedules `/api/reminders/send` once daily (`0 12 * * *`
   UTC — Vercel has no per-schedule timezone support, so shift the hour yourself and
   nudge it twice a year for daylight saving if that matters).

All four env vars go in `.env.local` locally and in Vercel's dashboard for production —
see `.env.example`.

**A note on this README:** it's already out of sync with the actual app in a couple of
places (references `supabase_schema.sql`, which isn't in this repo, and says live-room
AI uses Anthropic Claude, though `src/app/api/ai/route.js` calls Gemini). Worth a
separate pass to reconcile — not something this change tried to fix.
