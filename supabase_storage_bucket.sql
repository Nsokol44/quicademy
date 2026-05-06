-- ============================================================
-- QUICADEMY — Storage: Course Materials Bucket
-- Run in Supabase SQL Editor
-- ============================================================

-- Create the storage bucket for course materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,  -- public so students can view uploaded files
  52428800,  -- 50MB per file limit
  ARRAY[
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/markdown', 'text/html',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated instructors to upload
CREATE POLICY "Instructors can upload course materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
    AND instructor_status = 'approved'
  )
);

-- Anyone can view/download course materials
CREATE POLICY "Course materials are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

-- Instructors can delete their own uploads
CREATE POLICY "Instructors can delete their uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
