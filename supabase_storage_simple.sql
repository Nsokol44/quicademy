-- ============================================================
-- QUICADEMY — Storage: Course Materials Bucket
-- Minimal version — authenticated users can upload
-- ============================================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-materials', 'course-materials', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies if any
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Course materials are publicly readable"  ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete their uploads"    ON storage.objects;

-- Anyone can view/download
CREATE POLICY "Course materials are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

-- Any authenticated user can upload
CREATE POLICY "Authenticated users can upload course materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-materials');

-- Users can delete their own files
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);
