-- Automation rules (Phase 5) — triggers for team events
-- Execution logic to be implemented separately (worker/cron)

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL,
  conditions jsonb DEFAULT '{}',
  actions jsonb NOT NULL DEFAULT '[]',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_team_id ON public.automation_rules(team_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_event_type ON public.automation_rules(event_type);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rules_select" ON public.automation_rules;
CREATE POLICY "automation_rules_select" ON public.automation_rules
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_insert" ON public.automation_rules;
CREATE POLICY "automation_rules_insert" ON public.automation_rules
  FOR INSERT WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_update" ON public.automation_rules;
CREATE POLICY "automation_rules_update" ON public.automation_rules
  FOR UPDATE USING (public.can_manage_team_members(team_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_delete" ON public.automation_rules;
CREATE POLICY "automation_rules_delete" ON public.automation_rules
  FOR DELETE USING (public.can_manage_team_members(team_id, auth.uid()));
