-- Avatars storage bucket for user profile pictures
-- Public bucket so avatar URLs work without signed URLs

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can read any avatar (bucket is public)
-- Users can only upload/update/delete their own avatar: avatars/{user_id}/*

DROP POLICY IF EXISTS "avatars_storage_select" ON storage.objects;
CREATE POLICY "avatars_storage_select" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_storage_insert" ON storage.objects;
CREATE POLICY "avatars_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_storage_update" ON storage.objects;
CREATE POLICY "avatars_storage_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_storage_delete" ON storage.objects;
CREATE POLICY "avatars_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
