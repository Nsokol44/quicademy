-- ============================================================
-- QUICADEMY — Migration: Submissions + Progress Tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Submissions table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Submission content
  text_response   TEXT,              -- written response
  file_url        TEXT,              -- uploaded file URL
  file_name       TEXT,              -- original filename
  status          TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','reviewed','returned')),
  -- Instructor feedback
  feedback_text   TEXT,
  feedback_grade  TEXT,              -- e.g. "A", "85/100", "Pass"
  feedback_by     UUID REFERENCES public.profiles(id),
  feedback_at     TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, student_id)       -- one submission per student per module
);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_module  ON public.submissions(module_id);
CREATE INDEX IF NOT EXISTS idx_submissions_course  ON public.submissions(course_id);

-- ── RLS for submissions ────────────────────────────────────
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Students see and manage their own submissions
DROP POLICY IF EXISTS "Students manage their submissions" ON public.submissions;
CREATE POLICY "Students manage their submissions"
  ON public.submissions FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Instructors see submissions for their courses
DROP POLICY IF EXISTS "Instructors see course submissions" ON public.submissions;
CREATE POLICY "Instructors see course submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- Instructors can update (add feedback) to submissions in their courses
DROP POLICY IF EXISTS "Instructors can give feedback" ON public.submissions;
CREATE POLICY "Instructors can give feedback"
  ON public.submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- ── Ensure module_progress table exists ───────────────────
CREATE TABLE IF NOT EXISTS public.module_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id       UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  time_spent_secs INTEGER DEFAULT 0,
  UNIQUE(student_id, module_id)
);

DROP POLICY IF EXISTS "Students manage their own progress" ON public.module_progress;
CREATE POLICY "Students manage their own progress"
  ON public.module_progress FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Instructors can read progress for their courses
DROP POLICY IF EXISTS "Instructors can view student progress" ON public.module_progress;
CREATE POLICY "Instructors can view student progress"
  ON public.module_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.instructor_id = auth.uid()
    )
  );

-- ── Add ai_enabled to live_rooms ──────────────────────────
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;

-- ── Realtime for submissions ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
  END IF;
END $$;
