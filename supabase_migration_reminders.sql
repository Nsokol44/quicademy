-- ============================================================
-- QUICADEMY — Migration: PDF course generation + SMS reminders
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── Generate course from PDF ──────────────────────────────
-- No schema change needed. Generated courses reuse the existing
-- courses / sections / modules tables exactly as the CourseForge
-- importer does (see src/app/instructor/import/pdf/GeneratePdfClient.jsx):
--   - one `sections` row per curriculum day (overview holds the
--     "done when" criterion + next-session recall prompt)
--   - one `modules` row per step within that day (content_type 'text'),
--     so per-step completion rides on the existing `module_progress` table
--   - troubleshooting/hotkeys land in one trailing ungrouped module

-- ── Daily SMS reminders ────────────────────────────────────
-- A student's phone number lives on their profile (reusable for any
-- future SMS feature, not just this one).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Reminder opt-in is per-enrollment (a student may want reminders for
-- one course but not another they're also enrolled in).
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;

-- Both columns are updated the same way `enrollments.progress` already is
-- today (LearnClient.jsx) — a plain authenticated client-side update
-- against the student's own row — so no new RLS policy should be needed
-- as long as your existing "students can update own enrollment" policy
-- isn't restricted to specific columns. Worth a quick test after running
-- this: toggle a reminder in Settings and confirm it saves.

CREATE INDEX IF NOT EXISTS idx_enrollments_sms_reminders
  ON public.enrollments(sms_reminders_enabled)
  WHERE sms_reminders_enabled = true;
