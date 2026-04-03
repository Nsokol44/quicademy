-- ============================================================
-- QUICADEMY — Safe Migration: Drop & Recreate Room Policies
-- Run this INSTEAD of supabase_migration_rooms.sql if you
-- get "policy already exists" errors
-- ============================================================

-- Add columns to live_rooms (safe - IF NOT EXISTS)
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'group'
    CHECK (room_type IN ('group', 'private')),
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'pending'));

CREATE INDEX IF NOT EXISTS idx_live_rooms_student ON public.live_rooms(student_id);
CREATE INDEX IF NOT EXISTS idx_live_rooms_type    ON public.live_rooms(room_type);

-- ── Drop ALL existing room policies (safe to re-run) ──────
DROP POLICY IF EXISTS "Room messages viewable by authenticated users"        ON public.room_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages"                ON public.room_messages;
DROP POLICY IF EXISTS "Group room messages are public to authenticated"      ON public.room_messages;
DROP POLICY IF EXISTS "Private room messages only for participants"          ON public.room_messages;
DROP POLICY IF EXISTS "Participants can send messages"                       ON public.room_messages;
DROP POLICY IF EXISTS "AI can insert messages"                               ON public.room_messages;
DROP POLICY IF EXISTS "Users can view relevant rooms"                        ON public.live_rooms;
DROP POLICY IF EXISTS "Instructors can manage their rooms"                   ON public.live_rooms;
DROP POLICY IF EXISTS "Students can request private rooms"                   ON public.live_rooms;

-- ── Recreate live_rooms policies ─────────────────────────
CREATE POLICY "Users can view relevant rooms"
  ON public.live_rooms FOR SELECT TO authenticated
  USING (
    room_type = 'group'
    OR instructor_id = auth.uid()
    OR student_id    = auth.uid()
  );

CREATE POLICY "Instructors can manage their rooms"
  ON public.live_rooms FOR ALL TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "Students can request private rooms"
  ON public.live_rooms FOR INSERT TO authenticated
  WITH CHECK (
    room_type  = 'private'
    AND student_id = auth.uid()
    AND status     = 'pending'
  );

-- ── Recreate room_messages policies ──────────────────────
CREATE POLICY "Group room messages are public to authenticated"
  ON public.room_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_rooms r
      WHERE r.id = room_id AND r.room_type = 'group'
    )
  );

CREATE POLICY "Private room messages only for participants"
  ON public.room_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_rooms r
      WHERE r.id = room_id
        AND r.room_type = 'private'
        AND (r.student_id = auth.uid() OR r.instructor_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.live_rooms r
      WHERE r.id = room_id
        AND (
          r.room_type = 'group'
          OR r.student_id    = auth.uid()
          OR r.instructor_id = auth.uid()
        )
    )
  );

CREATE POLICY "AI can insert messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (sender_id IS NULL AND is_ai = true);

-- ── Enable realtime (safe to re-run) ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rooms;