-- ============================================================
-- QUICADEMY — Combined migration (idempotent)
-- Run in Supabase SQL Editor. Safe to run multiple times, on a
-- database that already has some/all of this applied: every
-- statement either uses IF NOT EXISTS / IF EXISTS / ON CONFLICT
-- DO NOTHING, or drops-then-recreates the object it touches, so
-- anything already in place is skipped or harmlessly reapplied,
-- and anything missing gets created.
--
-- SCOPE — what this file does and does NOT cover:
--   Combines the three migrations that exist in this repo:
--     - supabase_migration_press.sql        (books/press)
--     - supabase_production_hardening.sql   (RLS, constraints, indexes)
--     - supabase_migration_reminders.sql    (PDF-course-gen + SMS reminders)
--   It does NOT include CREATE TABLE statements for the core tables
--   (profiles, courses, sections, modules, enrollments, module_progress,
--   submissions, live_rooms, room_messages, notifications, class_members,
--   etc.) — there's no supabase_schema.sql in this repo, and I don't have
--   a reliable, complete definition of those tables (exact column types,
--   defaults, constraints) to safely fabricate one. This file assumes
--   those tables already exist, which they do on your production project.
--   If you ever need a true from-scratch schema (new environment, disaster
--   recovery), pull it directly from the live project instead of trusting
--   a reconstruction:
--     supabase db dump --db-url <connection-string> -f schema.sql
--   or Supabase Dashboard -> Database -> Backups / Schema Visualizer.
-- ============================================================

-- ── Shared function used by every updated_at trigger below ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. PRESS / BOOKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  title           TEXT NOT NULL,
  subtitle        TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  short_desc      TEXT,

  cover_url       TEXT,
  pdf_url         TEXT,
  purchase_url    TEXT,

  isbn            TEXT,
  publisher       TEXT DEFAULT 'Quicademy Press',
  publish_date    DATE,
  pages           INTEGER,
  edition         TEXT,
  language        TEXT DEFAULT 'English',
  categories      TEXT[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',

  price           NUMERIC(10,2),
  is_free         BOOLEAN DEFAULT FALSE,

  published       BOOLEAN DEFAULT FALSE,
  featured        BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_published  ON public.books(published, featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_books_author     ON public.books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_slug       ON public.books(slug);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published books are public" ON public.books;
CREATE POLICY "Published books are public"
  ON public.books FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Admins manage books" ON public.books;
CREATE POLICY "Admins manage books"
  ON public.books FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'press-assets', 'press-assets', true, 104857600,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Press assets are publicly readable" ON storage.objects;
CREATE POLICY "Press assets are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'press-assets');

DROP POLICY IF EXISTS "Admins can upload press assets" ON storage.objects;
CREATE POLICY "Admins can upload press assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'press-assets'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete press assets" ON storage.objects;
CREATE POLICY "Admins can delete press assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'press-assets'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- 2. PRODUCTION HARDENING
-- ============================================================

-- Lock down profiles table
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can change roles" ON public.profiles;
CREATE POLICY "Only admins can change roles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enrollments — prevent duplicate enrollments
ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_unique_enrollment,
  ADD CONSTRAINT enrollments_unique_enrollment UNIQUE (student_id, course_id);

-- Submissions — one per student per module
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_unique,
  ADD CONSTRAINT submissions_unique UNIQUE (module_id, student_id);

-- updated_at triggers on core tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses','modules','enrollments','submissions','profiles']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- Prevent module deletion when submissions exist
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_module_fk,
  ADD CONSTRAINT submissions_module_fk
    FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_enrollments_student    ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course     ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_published      ON public.courses(published, approved);
CREATE INDEX IF NOT EXISTS idx_courses_instructor     ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_sort    ON public.modules(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_room_messages_room     ON public.room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id, read, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_course     ON public.submissions(course_id, status);

-- Realtime — only for tables that need it
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rooms;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Storage: course-materials bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-materials', 'course-materials', true, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Course materials are publicly readable"           ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course materials"  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads"               ON storage.objects;

CREATE POLICY "Course materials are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'course-materials');

CREATE POLICY "Authenticated users can upload course materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );


-- ============================================================
-- 3. GENERATE COURSE FROM PDF + DAILY SMS REMINDERS
-- ============================================================

-- "Generate course from PDF" needs no schema change — it writes into
-- courses/sections/modules the same way the CourseForge importer does.

-- Daily SMS reminders:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_enrollments_sms_reminders
  ON public.enrollments(sms_reminders_enabled)
  WHERE sms_reminders_enabled = true;

-- Both new enrollments columns are updated the same way `enrollments.progress`
-- already is today (LearnClient.jsx) — a plain authenticated client-side
-- update against the student's own row — so no new RLS policy should be
-- needed as long as your enrollments UPDATE policy isn't column-restricted.
-- Worth a quick test after running this: toggle a reminder in Settings.


-- ============================================================
-- Done. Each section above is independently re-runnable; running
-- this whole file again later (e.g. after adding more to one
-- section) will only apply what's changed.
-- ============================================================
