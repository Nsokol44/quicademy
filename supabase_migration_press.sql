-- ============================================================
-- QUICADEMY — Migration: Press / Books
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Core metadata
  title           TEXT NOT NULL,
  subtitle        TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,                -- long-form description / back cover copy
  short_desc      TEXT,                -- one-liner for cards

  -- Files
  cover_url       TEXT,                -- book cover image (Supabase Storage)
  pdf_url         TEXT,                -- free PDF download (optional)
  purchase_url    TEXT,                -- link to Amazon KDP, Gumroad, etc.

  -- Metadata
  isbn            TEXT,
  publisher       TEXT DEFAULT 'Quicademy Press',
  publish_date    DATE,
  pages           INTEGER,
  edition         TEXT,                -- e.g. "1st Edition"
  language        TEXT DEFAULT 'English',
  categories      TEXT[] DEFAULT '{}', -- e.g. {"GIS","Data Science","Python"}
  tags            TEXT[] DEFAULT '{}',

  -- Pricing
  price           NUMERIC(10,2),
  is_free         BOOLEAN DEFAULT FALSE,

  -- Status
  published       BOOLEAN DEFAULT FALSE,
  featured        BOOLEAN DEFAULT FALSE, -- shows prominently on press page
  sort_order      INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_published  ON public.books(published, featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_books_author     ON public.books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_slug       ON public.books(slug);

-- RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Public can read published books
CREATE POLICY "Published books are public"
  ON public.books FOR SELECT
  USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins manage books"
  ON public.books FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for book assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'press-assets',
  'press-assets',
  true,
  104857600, -- 100MB (for PDFs)
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

RAISE NOTICE 'Press migration complete.';
