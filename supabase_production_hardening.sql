-- ============================================================
-- QUICADEMY — Production Hardening SQL
-- Run in Supabase SQL Editor after all other migrations
-- ============================================================

-- ── 1. Enable leaked password protection ─────────────────
-- Supabase Auth: enable HaveIBeenPwned check (do this in Dashboard)
-- Auth > Settings > "Check for leaked passwords" toggle ON

-- ── 2. Lock down profiles table ──────────────────────────
-- Users should only update their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from self-promoting to instructor or admin
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Users can read all profiles (needed for instructor names on courses)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Only admins can change roles
DROP POLICY IF EXISTS "Only admins can change roles" ON public.profiles;
CREATE POLICY "Only admins can change roles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 3. Enrollments — prevent duplicate enrollments ───────
ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_unique_enrollment,
  ADD CONSTRAINT enrollments_unique_enrollment UNIQUE (student_id, course_id);

-- ── 4. Submissions — one per student per module ──────────
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_unique,
  ADD CONSTRAINT submissions_unique UNIQUE (module_id, student_id);

-- ── 5. Add updated_at triggers ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

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

-- ── 6. Prevent module deletion when submissions exist ─────
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_module_fk,
  ADD CONSTRAINT submissions_module_fk
    FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;

-- ── 7. Add index for common query patterns ────────────────
CREATE INDEX IF NOT EXISTS idx_enrollments_student    ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course     ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_published      ON public.courses(published, approved);
CREATE INDEX IF NOT EXISTS idx_courses_instructor     ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_sort    ON public.modules(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_room_messages_room     ON public.room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id, read, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_course     ON public.submissions(course_id, status);

-- ── 8. Realtime — only enable for tables that need it ─────
-- (reduces unnecessary replication load)
DO $$
BEGIN
  -- Add tables that need realtime if not already added
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

-- ── 9. Storage: ensure bucket exists ─────────────────────
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

RAISE NOTICE 'Production hardening complete.';
