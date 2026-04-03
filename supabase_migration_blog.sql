-- ============================================================
-- QUICADEMY — Migration: Blog Posts + Admin Role
-- Run this in your Supabase SQL editor
-- ============================================================

-- Blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  excerpt          TEXT,
  content_html     TEXT,
  category         TEXT,
  author_name      TEXT,
  author_role      TEXT,
  cover_image_url  TEXT,
  read_time_mins   INTEGER,
  published        BOOLEAN DEFAULT FALSE,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Published posts are public"
  ON public.blog_posts FOR SELECT
  USING (published = true);

-- Only admins can do everything
CREATE POLICY "Admins manage all posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add admin role to profiles check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'instructor', 'admin'));

-- Sitemap index for blog posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug      ON public.blog_posts(slug);

-- ── TO MAKE YOURSELF AN ADMIN ──────────────────────────────
-- After running this migration, go to Table Editor → profiles
-- find your row and set role = 'admin'
-- Then /blog/admin will be accessible to your account
