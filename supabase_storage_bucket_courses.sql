-- ============================================================
-- QUICADEMY — Storage: Course Materials Bucket (Safe Version)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create the bucket (safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'course-materials',
  'course-materials',
  true,
  52428800  -- 50MB limit
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Course materials are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete their uploads"   ON storage.objects;

-- Anyone can read/download files
CREATE POLICY "Course materials are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

-- Approved instructors and admins can upload
CREATE POLICY "Instructors can upload course materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (
    SELECT p.role IN ('instructor', 'admin')
      AND (p.role = 'admin' OR p.instructor_status = 'approved')
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

-- Users can delete files they uploaded (stored under their user id prefix)
CREATE POLICY "Instructors can delete their uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);
