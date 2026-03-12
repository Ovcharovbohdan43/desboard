-- Storage bucket for project files (create if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  52428800,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path format team_id/folder_id/filename (first segment = team_id)
DROP POLICY IF EXISTS "project_files_storage_select" ON storage.objects;
CREATE POLICY "project_files_storage_select" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "project_files_storage_insert" ON storage.objects;
CREATE POLICY "project_files_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "project_files_storage_update" ON storage.objects;
CREATE POLICY "project_files_storage_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "project_files_storage_delete" ON storage.objects;
CREATE POLICY "project_files_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
