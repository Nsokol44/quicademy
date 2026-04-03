-- ============================================================
-- QUICADEMY — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ──────────────────────────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','instructor','admin')),

  -- Student learning profile
  learning_style  TEXT CHECK (learning_style IN ('visual','auditory','reading','kinesthetic')),
  industry        TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  goals           TEXT[],
  onboarded       BOOLEAN DEFAULT FALSE,

  -- Instructor fields
  bio             TEXT,
  credentials     TEXT,
  expertise       TEXT[],
  instructor_status TEXT DEFAULT 'pending' CHECK (instructor_status IN ('pending','approved','rejected')),

  -- Company/employer link
  company_name    TEXT,
  company_size    TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- COURSES
-- ──────────────────────────────────────────
CREATE TABLE public.courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  short_desc      TEXT,
  thumbnail_url   TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  level           TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  duration_hours  NUMERIC(4,1),
  price           NUMERIC(8,2) DEFAULT 0,
  is_free         BOOLEAN DEFAULT FALSE,
  published       BOOLEAN DEFAULT FALSE,
  approved        BOOLEAN DEFAULT FALSE,
  tags            TEXT[],
  learning_styles TEXT[], -- which styles this course serves well
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- MODULES (lessons within a course)
-- ──────────────────────────────────────────
CREATE TABLE public.modules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  content_type    TEXT CHECK (content_type IN ('video','text','interactive','quiz','scenario')),
  content_url     TEXT,
  content_body    TEXT, -- markdown content
  sort_order      INTEGER DEFAULT 0,
  duration_mins   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- ENROLLMENTS
-- ──────────────────────────────────────────
CREATE TABLE public.enrollments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  progress        INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  UNIQUE(student_id, course_id)
);

-- ──────────────────────────────────────────
-- LIVE ROOMS
-- ──────────────────────────────────────────
CREATE TABLE public.live_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id   UUID REFERENCES public.profiles(id),
  title           TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- LIVE ROOM MESSAGES
-- ──────────────────────────────────────────
CREATE TABLE public.room_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id         UUID REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES public.profiles(id),
  sender_name     TEXT,
  sender_role     TEXT,
  content         TEXT NOT NULL,
  is_ai           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- MODULE PROGRESS
-- ──────────────────────────────────────────
CREATE TABLE public.module_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id       UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  time_spent_secs INTEGER DEFAULT 0,
  UNIQUE(student_id, module_id)
);

-- ──────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: users can see all profiles, edit only their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Courses: published+approved are public; instructors manage their own
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT USING (published = true AND approved = true);

CREATE POLICY "Instructors can manage their own courses"
  ON public.courses FOR ALL TO authenticated USING (auth.uid() = instructor_id);

-- Modules: visible if course is published
CREATE POLICY "Modules visible for published courses"
  ON public.modules FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.published = true AND c.approved = true)
  );

-- Enrollments: users see their own
CREATE POLICY "Students see their own enrollments"
  ON public.enrollments FOR ALL TO authenticated USING (auth.uid() = student_id);

-- Live rooms: enrolled students see rooms for their courses
CREATE POLICY "Room messages viewable by authenticated users"
  ON public.room_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Module progress: own only
CREATE POLICY "Students manage their own progress"
  ON public.module_progress FOR ALL TO authenticated USING (auth.uid() = student_id);

-- ──────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- REALTIME: enable for live rooms
-- ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rooms;

-- ──────────────────────────────────────────
-- SAMPLE DATA
-- ──────────────────────────────────────────
INSERT INTO public.courses (title, slug, description, short_desc, category, level, duration_hours, is_free, published, approved, tags, learning_styles)
VALUES
  ('Electrical Safety Fundamentals', 'electrical-safety-fundamentals',
   'A comprehensive introduction to electrical safety standards, hazard identification, and safe work practices for apprentice and journeyman electricians.',
   'Master OSHA electrical standards and safe work practices.',
   'Electrical', 'beginner', 8.5, true, true, true,
   ARRAY['OSHA','safety','electrical','apprentice'], ARRAY['visual','reading']),

  ('HVAC Load Calculations', 'hvac-load-calculations',
   'Learn to perform accurate residential and commercial HVAC load calculations using Manual J methodology. Includes real-world scenarios and AI-assisted feedback.',
   'Manual J load calculations for residential and commercial projects.',
   'HVAC', 'intermediate', 12.0, false, true, true,
   ARRAY['HVAC','Manual J','load calc'], ARRAY['reading','kinesthetic']),

  ('Plumbing Code Essentials', 'plumbing-code-essentials',
   'Navigate the International Plumbing Code with confidence. Expert instructors walk through real inspection scenarios and common code violations.',
   'IPC compliance and real-world inspection scenarios.',
   'Plumbing', 'beginner', 6.0, false, true, true,
   ARRAY['IPC','code','plumbing'], ARRAY['visual','auditory']);
