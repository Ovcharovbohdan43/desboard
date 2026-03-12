-- Team branding settings (Phase 3)
CREATE TABLE IF NOT EXISTS public.team_settings (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  primary_color text DEFAULT '#6366f1',
  logo_url text,
  font_family text DEFAULT 'system',
  meta jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_settings_select" ON public.team_settings;
CREATE POLICY "team_settings_select" ON public.team_settings
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "team_settings_insert" ON public.team_settings;
CREATE POLICY "team_settings_insert" ON public.team_settings
  FOR INSERT WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));

DROP POLICY IF EXISTS "team_settings_update" ON public.team_settings;
CREATE POLICY "team_settings_update" ON public.team_settings
  FOR UPDATE USING (public.can_manage_team_members(team_id, auth.uid()));
