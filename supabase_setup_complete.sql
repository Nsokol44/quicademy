-- ============================================================
-- QUICADEMY — Consolidated Safe Migration (run this once)
-- Safe to run even if previous migrations were partially applied.
-- Every statement uses IF NOT EXISTS / IF EXISTS / DO blocks.
-- ============================================================

-- ── 1. EXTENSIONS ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. TABLES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  full_name        TEXT,
  avatar_url       TEXT,
  role             TEXT NOT NULL DEFAULT 'student',
  learning_style   TEXT,
  industry         TEXT,
  experience_level TEXT,
  goals            TEXT[],
  onboarded        BOOLEAN DEFAULT FALSE,
  bio              TEXT,
  credentials      TEXT,
  expertise        TEXT[],
  instructor_status TEXT DEFAULT 'pending',
  company_name     TEXT,
  company_size     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  short_desc      TEXT,
  thumbnail_url   TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  level           TEXT DEFAULT 'beginner',
  duration_hours  NUMERIC(4,1),
  price           NUMERIC(8,2) DEFAULT 0,
  is_free         BOOLEAN DEFAULT FALSE,
  published       BOOLEAN DEFAULT FALSE,
  approved        BOOLEAN DEFAULT FALSE,
  tags            TEXT[],
  learning_styles TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.modules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  content_type  TEXT,
  content_url   TEXT,
  content_body  TEXT,
  sort_order    INTEGER DEFAULT 0,
  duration_mins INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress     INTEGER DEFAULT 0,
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.live_rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.profiles(id),
  title         TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES public.profiles(id),
  sender_name TEXT,
  sender_role TEXT,
  content     TEXT NOT NULL,
  is_ai       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.module_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id       UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  time_spent_secs INTEGER DEFAULT 0,
  UNIQUE(student_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  excerpt         TEXT,
  content_html    TEXT,
  category        TEXT,
  author_name     TEXT,
  author_role     TEXT,
  cover_image_url TEXT,
  read_time_mins  INTEGER,
  published       BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ADD COLUMNS (idempotent) ───────────────────────────

ALTER TABLE public.live_rooms
  ADD COLUMN IF NOT EXISTS room_type  TEXT NOT NULL DEFAULT 'group',
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'active';

-- ── 4. CONSTRAINTS ────────────────────────────────────────

-- profiles.role
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'instructor', 'admin'));

-- live_rooms.room_type
ALTER TABLE public.live_rooms
  DROP CONSTRAINT IF EXISTS live_rooms_room_type_check;
ALTER TABLE public.live_rooms
  ADD CONSTRAINT live_rooms_room_type_check
  CHECK (room_type IN ('group', 'private'));

-- live_rooms.status
ALTER TABLE public.live_rooms
  DROP CONSTRAINT IF EXISTS live_rooms_status_check;
ALTER TABLE public.live_rooms
  ADD CONSTRAINT live_rooms_status_check
  CHECK (status IN ('active', 'ended', 'pending'));

-- ── 5. INDEXES ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_live_rooms_student    ON public.live_rooms(student_id);
CREATE INDEX IF NOT EXISTS idx_live_rooms_type       ON public.live_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON public.blog_posts(slug);

-- ── 6. RLS ENABLE ─────────────────────────────────────────

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_rooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;

-- ── 7. DROP ALL POLICIES (clean slate) ────────────────────

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"           ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view published courses"            ON public.courses;
DROP POLICY IF EXISTS "Instructors can manage their own courses"     ON public.courses;

DROP POLICY IF EXISTS "Modules visible for published courses"        ON public.modules;

DROP POLICY IF EXISTS "Students see their own enrollments"           ON public.enrollments;

DROP POLICY IF EXISTS "Users can view relevant rooms"                ON public.live_rooms;
DROP POLICY IF EXISTS "Instructors can manage their rooms"           ON public.live_rooms;
DROP POLICY IF EXISTS "Students can request private rooms"           ON public.live_rooms;

DROP POLICY IF EXISTS "Room messages viewable by authenticated users"       ON public.room_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages"               ON public.room_messages;
DROP POLICY IF EXISTS "Group room messages are public to authenticated"     ON public.room_messages;
DROP POLICY IF EXISTS "Private room messages only for participants"         ON public.room_messages;
DROP POLICY IF EXISTS "Participants can send messages"                      ON public.room_messages;
DROP POLICY IF EXISTS "AI can insert messages"                              ON public.room_messages;

DROP POLICY IF EXISTS "Students manage their own progress"                  ON public.module_progress;

DROP POLICY IF EXISTS "Published posts are public"                          ON public.blog_posts;
DROP POLICY IF EXISTS "Admins manage all posts"                             ON public.blog_posts;

-- ── 8. RECREATE ALL POLICIES ──────────────────────────────

-- profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- courses
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT USING (published = true AND approved = true);
CREATE POLICY "Instructors can manage their own courses"
  ON public.courses FOR ALL TO authenticated USING (auth.uid() = instructor_id);

-- modules
CREATE POLICY "Modules visible for published courses"
  ON public.modules FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.published = true AND c.approved = true)
  );

-- enrollments
CREATE POLICY "Students see their own enrollments"
  ON public.enrollments FOR ALL TO authenticated USING (auth.uid() = student_id);

-- live_rooms
CREATE POLICY "Users can view relevant rooms"
  ON public.live_rooms FOR SELECT TO authenticated
  USING (room_type = 'group' OR instructor_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Instructors can manage their rooms"
  ON public.live_rooms FOR ALL TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "Students can request private rooms"
  ON public.live_rooms FOR INSERT TO authenticated
  WITH CHECK (room_type = 'private' AND student_id = auth.uid() AND status = 'pending');

-- room_messages
CREATE POLICY "Group room messages are public to authenticated"
  ON public.room_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.live_rooms r WHERE r.id = room_id AND r.room_type = 'group')
  );

CREATE POLICY "Private room messages only for participants"
  ON public.room_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_rooms r WHERE r.id = room_id
        AND r.room_type = 'private'
        AND (r.student_id = auth.uid() OR r.instructor_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.live_rooms r WHERE r.id = room_id
        AND (r.room_type = 'group' OR r.student_id = auth.uid() OR r.instructor_id = auth.uid())
    )
  );

CREATE POLICY "AI can insert messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (sender_id IS NULL AND is_ai = true);

-- module_progress
CREATE POLICY "Students manage their own progress"
  ON public.module_progress FOR ALL TO authenticated USING (auth.uid() = student_id);

-- blog_posts
CREATE POLICY "Published posts are public"
  ON public.blog_posts FOR SELECT USING (published = true);

CREATE POLICY "Admins manage all posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 9. AUTO-PROFILE TRIGGER ───────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 10. REALTIME (only add if not already a member) ───────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rooms;
  END IF;
END $$;

-- ── 11. SAMPLE DATA ───────────────────────────────────────

INSERT INTO public.courses (title, slug, description, short_desc, category, level, duration_hours, is_free, published, approved, tags, learning_styles)
VALUES
  ('Electrical Safety Fundamentals', 'electrical-safety-fundamentals',
   'A comprehensive introduction to electrical safety standards and safe work practices.',
   'Master electrical safety standards and safe work practices.',
   'Trades & Vocational', 'beginner', 8.5, true, true, true,
   ARRAY['safety','electrical','beginner'], ARRAY['visual','reading']),
  ('Python for Data Science', 'python-for-data-science',
   'Learn Python from scratch through real data projects. No prior coding experience needed.',
   'Go from zero to working data scientist with Python.',
   'Technology', 'beginner', 14.0, false, true, true,
   ARRAY['python','data','programming'], ARRAY['reading','kinesthetic']),
  ('Business Communication Essentials', 'business-communication-essentials',
   'Build the written and verbal communication skills that drive career growth.',
   'Write better, speak confidently, advance faster.',
   'Business', 'beginner', 6.0, true, true, true,
   ARRAY['communication','business','soft skills'], ARRAY['auditory','reading'])
ON CONFLICT (slug) DO NOTHING;
