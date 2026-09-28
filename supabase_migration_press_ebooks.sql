-- ============================================================
-- QUICADEMY — Migration: Press ebooks (Stripe fulfillment)
-- Run in Supabase SQL Editor AFTER supabase_migration_press.sql
-- ============================================================

-- 1. Where the paid ebook file lives (path inside the press-ebooks bucket)
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS ebook_path TEXT;

-- 2. Purchase records (written by the Stripe webhook, service role only)
CREATE TABLE IF NOT EXISTS public.ebook_purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id             UUID REFERENCES public.books(id) ON DELETE SET NULL,
  email               TEXT NOT NULL,
  stripe_session_id   TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,
  amount              NUMERIC(10,2),
  currency            TEXT DEFAULT 'usd',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ebook_purchases_book  ON public.ebook_purchases(book_id);
CREATE INDEX IF NOT EXISTS idx_ebook_purchases_email ON public.ebook_purchases(email);

ALTER TABLE public.ebook_purchases ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service role (webhook / download signing) touches this table.

-- 3. Private bucket for paid ebook files (signed URLs only, never public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'press-ebooks',
  'press-ebooks',
  false,
  104857600, -- 100MB
  ARRAY['application/epub+zip','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload ebook files from /press/admin
DROP POLICY IF EXISTS "Admins can upload ebooks" ON storage.objects;
CREATE POLICY "Admins can upload ebooks"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'press-ebooks'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete ebooks" ON storage.objects;
CREATE POLICY "Admins can delete ebooks"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'press-ebooks'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTE: no SELECT policy on press-ebooks for anon/authenticated roles,
-- so files stay private. Downloads are served via time-limited signed
-- URLs generated server-side after Stripe payment verification.

RAISE NOTICE 'Press ebooks migration complete.';
