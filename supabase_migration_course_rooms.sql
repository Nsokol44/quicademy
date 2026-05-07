-- ============================================================
-- QUICADEMY — Migration: course_id on live_rooms
-- Enables per-course group chat rooms
-- Run in Supabase SQL Editor
-- ============================================================

-- Add course_id to live_rooms if it doesn't exist
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_rooms_course ON public.live_rooms(course_id);

-- Add ai_enabled if not already there (from submissions migration)
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;
