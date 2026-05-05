-- ============================================================
-- QUICADEMY — Migration: Class System
-- Adds classes, TA role, notifications, anonymous display names
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. CLASSES TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  instructor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  join_code       TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 6)),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CLASS MEMBERSHIPS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','ta','instructor')),
  -- Anonymous display name shown to other students in class chat
  anon_name       TEXT NOT NULL DEFAULT 'Student',
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- ── 3. ADD class_id TO live_rooms ────────────────────────
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- Add 'class' to room_type check
ALTER TABLE public.live_rooms DROP CONSTRAINT IF EXISTS live_rooms_room_type_check;
ALTER TABLE public.live_rooms ADD CONSTRAINT live_rooms_room_type_check
  CHECK (room_type IN ('group', 'private', 'class'));

-- ── 4. ADD secondary_instructor TO live_rooms (for 2-on-1) ─
ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS secondary_instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 5. ADD anonymised_name TO room_messages ──────────────
-- For class rooms, this stores what OTHER students see
ALTER TABLE public.room_messages
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ── 6. NOTIFICATIONS TABLE ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'new_question','private_request','room_started','ta_assigned'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user  ON public.class_members(user_id);

-- ── 7. RLS ───────────────────────────────────────────────
ALTER TABLE public.classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- classes: members can view, instructors manage
DROP POLICY IF EXISTS "Class members can view their classes" ON public.classes;
CREATE POLICY "Class members can view their classes"
  ON public.classes FOR SELECT TO authenticated
  USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.class_members WHERE class_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors manage their classes" ON public.classes;
CREATE POLICY "Instructors manage their classes"
  ON public.classes FOR ALL TO authenticated
  USING (instructor_id = auth.uid());

-- Anyone authenticated can join a class (insert their own membership)
DROP POLICY IF EXISTS "Students can join classes" ON public.class_members;
CREATE POLICY "Students can join classes"
  ON public.class_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view class membership" ON public.class_members;
CREATE POLICY "Members can view class membership"
  ON public.class_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.class_members cm2
      WHERE cm2.class_id = class_id AND cm2.user_id = auth.uid()
        AND cm2.role IN ('instructor','ta')
    )
  );

-- Notifications: own only
DROP POLICY IF EXISTS "Users see their own notifications" ON public.notifications;
CREATE POLICY "Users see their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update their own notifications" ON public.notifications;
CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── 8. REALTIME ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; END IF;
END $$;

-- ── 9. ANONYMOUS NAME GENERATOR FUNCTION ─────────────────
-- Generates a unique anonymous name per student per class
CREATE OR REPLACE FUNCTION public.generate_anon_name(p_class_id UUID)
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Amber','Blue','Coral','Dawn','Ember','Frost','Gold','Haze',
    'Indigo','Jade','Keen','Lunar','Misty','Nova','Opal','Pine','Quartz','Ruby',
    'Silver','Teal','Ultra','Vivid','Wisp','Xenon','Yellow','Zinc'];
  nouns TEXT[] := ARRAY['Atom','Beam','Cloud','Dune','Echo','Flame','Glyph','Helix',
    'Ion','Jet','Knot','Lens','Mist','Node','Orbit','Prism','Query','Ridge',
    'Spark','Tide','Unit','Veil','Wave','Xray','Yield','Zone'];
  existing_count INTEGER;
  candidate TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    candidate := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
      || ' ' || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    SELECT COUNT(*) INTO existing_count
      FROM public.class_members WHERE class_id = p_class_id AND anon_name = candidate;
    EXIT WHEN existing_count = 0 OR attempts > 50;
    attempts := attempts + 1;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- ── 10. AUTO-ASSIGN ANON NAME ON JOIN ────────────────────
CREATE OR REPLACE FUNCTION public.handle_class_member_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    NEW.anon_name := public.generate_anon_name(NEW.class_id);
  ELSE
    -- TAs and instructors keep their real names
    SELECT full_name INTO NEW.anon_name FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_class_member_insert ON public.class_members;
CREATE TRIGGER on_class_member_insert
  BEFORE INSERT ON public.class_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_class_member_insert();
