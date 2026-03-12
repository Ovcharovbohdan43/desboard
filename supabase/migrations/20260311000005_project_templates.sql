-- Workspace Phase 4: project templates (create project from template)
-- Templates are per-team; config stores default project structure (tasks, milestones, etc.)

CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_templates_team_id ON public.project_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON public.project_templates(category);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_templates_select" ON public.project_templates;
CREATE POLICY "project_templates_select" ON public.project_templates
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "project_templates_insert" ON public.project_templates;
CREATE POLICY "project_templates_insert" ON public.project_templates
  FOR INSERT WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));

DROP POLICY IF EXISTS "project_templates_update" ON public.project_templates;
CREATE POLICY "project_templates_update" ON public.project_templates
  FOR UPDATE USING (public.can_manage_team_members(team_id, auth.uid()));

DROP POLICY IF EXISTS "project_templates_delete" ON public.project_templates;
CREATE POLICY "project_templates_delete" ON public.project_templates
  FOR DELETE USING (public.can_manage_team_members(team_id, auth.uid()));

COMMENT ON TABLE public.project_templates IS 'Templates for creating new projects (Phase 4 Workspace).';
