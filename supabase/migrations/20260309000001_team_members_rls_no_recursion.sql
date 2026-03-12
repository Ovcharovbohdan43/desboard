-- Fix infinite recursion in team_members RLS policies.
-- Policies must not reference team_members when evaluating team_members.

-- Function runs as definer, so SELECT on team_members inside does not trigger RLS.
CREATE OR REPLACE FUNCTION public.can_access_team_members(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team_id AND t.created_by = p_user_id)
  OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = p_team_id AND tm.user_id = p_user_id);
$$;

-- Replace INSERT policy: only check teams (creator may add members). No team_members reference.
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
CREATE POLICY "team_members_insert_policy" ON public.team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
    )
  );

-- Replace SELECT policy: use definer function so no recursion.
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members
  FOR SELECT
  USING (public.can_access_team_members(team_id, auth.uid()));
