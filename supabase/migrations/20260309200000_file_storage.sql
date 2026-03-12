-- Phase 5: File Storage — file_folders, files, Storage bucket

-- file_folders
CREATE TABLE IF NOT EXISTS public.file_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.file_folders(id) ON DELETE CASCADE,
  color text DEFAULT 'hsl(220 10% 45%)',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- files (metadata; actual files in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.file_folders(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'file',
  size_bytes bigint DEFAULT 0,
  storage_path text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version integer DEFAULT 1,
  starred boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_folders_team_id ON public.file_folders(team_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_id ON public.file_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_added_by ON public.files(added_by);

-- RLS
ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_folders_select" ON public.file_folders FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "file_folders_insert" ON public.file_folders FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "file_folders_update" ON public.file_folders FOR UPDATE
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "file_folders_delete" ON public.file_folders FOR DELETE
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "files_select" ON public.files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.file_folders f
      WHERE f.id = files.folder_id AND public.is_team_member(f.team_id, auth.uid())
    )
  );
CREATE POLICY "files_insert" ON public.files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.file_folders f
      WHERE f.id = files.folder_id AND public.is_team_member(f.team_id, auth.uid())
    )
  );
CREATE POLICY "files_update" ON public.files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.file_folders f
      WHERE f.id = files.folder_id AND public.is_team_member(f.team_id, auth.uid())
    )
  );
CREATE POLICY "files_delete" ON public.files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.file_folders f
      WHERE f.id = files.folder_id AND public.is_team_member(f.team_id, auth.uid())
    )
  );
