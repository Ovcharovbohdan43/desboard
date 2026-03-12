-- RLS for Phase 2 tables

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- clients
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (public.is_team_member(team_id, auth.uid()));

-- projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (public.is_team_member(team_id, auth.uid()));

-- tasks
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- milestones
CREATE POLICY "milestones_select" ON public.milestones FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "milestones_insert" ON public.milestones FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "milestones_update" ON public.milestones FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "milestones_delete" ON public.milestones FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- project_files
CREATE POLICY "project_files_select" ON public.project_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "project_files_insert" ON public.project_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "project_files_delete" ON public.project_files FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
