-- ============================================================
-- QUICADEMY — Migration: Course Sections
-- Adds week/topic grouping to the curriculum
-- Run in Supabase SQL Editor
-- ============================================================

-- Sections table (Week 1, Topic 1, etc.)
CREATE TABLE IF NOT EXISTS public.sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,           -- e.g. "Week 1: Foundations of GIS"
  overview    TEXT,                    -- concept overview / learning objectives
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add section_id to modules (nullable — existing modules stay ungrouped)
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sections_course   ON public.sections(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_modules_section   ON public.modules(section_id, sort_order);

-- RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sections visible for published courses" ON public.sections;
CREATE POLICY "Sections visible for published courses"
  ON public.sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (c.published = true OR c.instructor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instructors manage their sections" ON public.sections;
CREATE POLICY "Instructors manage their sections"
  ON public.sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- Fix modules policy to also allow inserts for instructors
DROP POLICY IF EXISTS "Instructors can manage their modules" ON public.modules;
CREATE POLICY "Instructors can manage their modules"
  ON public.modules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- Fix courses insert policy
DROP POLICY IF EXISTS "Instructors can insert courses" ON public.courses;
CREATE POLICY "Instructors can insert courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (instructor_id = auth.uid());
