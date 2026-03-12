-- Add UPDATE policy for project_files (completeness; allows renaming/metadata updates)
CREATE POLICY "project_files_update" ON public.project_files FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
