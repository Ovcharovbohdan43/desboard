-- RLS for Phase 3: Client Portal + Handoff tables

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- deliverables
CREATE POLICY "deliverables_select" ON public.deliverables FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = deliverables.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "deliverables_insert" ON public.deliverables FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = deliverables.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "deliverables_update" ON public.deliverables FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = deliverables.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "deliverables_delete" ON public.deliverables FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = deliverables.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- Allow anonymous read for external client portal (project access via link/token)
-- For now: external clients need auth or a public link. We'll add anon read policy
-- when implementing client auth. For MVP, only team members can read/write.

-- handoff_versions
CREATE POLICY "handoff_versions_select" ON public.handoff_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = handoff_versions.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "handoff_versions_insert" ON public.handoff_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = handoff_versions.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "handoff_versions_update" ON public.handoff_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = handoff_versions.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "handoff_versions_delete" ON public.handoff_versions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = handoff_versions.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- client_messages
CREATE POLICY "client_messages_select" ON public.client_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = client_messages.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "client_messages_insert" ON public.client_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = client_messages.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "client_messages_update" ON public.client_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = client_messages.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "client_messages_delete" ON public.client_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = client_messages.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- invoices
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = invoices.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = invoices.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = invoices.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = invoices.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
