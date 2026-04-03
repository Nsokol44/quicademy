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
