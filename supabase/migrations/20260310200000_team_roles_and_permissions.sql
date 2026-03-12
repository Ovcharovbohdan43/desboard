-- Team roles, permissions, and member management
-- Hierarchy: owner > admin > member > guest
-- - owner: full control, can delete team, manage members
-- - admin: can add/remove members, change roles, manage clients/projects
-- - member: can work on projects, manage clients (default)
-- - guest: read-only access to team resources

-- 1. Enforce valid roles
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'guest'));

-- 2. SECURITY DEFINER helper: can user manage team members? (add, remove, change roles)
CREATE OR REPLACE FUNCTION public.can_manage_team_members(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team_id AND t.created_by = p_user_id)
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id AND tm.user_id = p_user_id AND tm.role IN ('owner', 'admin')
  );
$$;

-- Creator is implicitly owner; ensure creator has owner in team_members (backfill)
INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, t.created_by, 'owner'
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = t.id AND tm.user_id = t.created_by
)
ON CONFLICT (team_id, user_id) DO UPDATE SET role = 'owner';

-- 4. team_members: allow admin/owner to INSERT (not only creator)
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
CREATE POLICY "team_members_insert_policy" ON public.team_members
  FOR INSERT
  WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));

-- 5. team_members: UPDATE (change role) - only owner/admin
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
CREATE POLICY "team_members_update_policy" ON public.team_members
  FOR UPDATE
  USING (public.can_manage_team_members(team_id, auth.uid()));

-- Trigger: prevent demoting the last owner
CREATE OR REPLACE FUNCTION public.prevent_remove_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' AND (NEW.role IS DISTINCT FROM 'owner' OR TG_OP = 'DELETE') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = OLD.team_id AND tm.role = 'owner' AND tm.id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove or demote the last owner of the team';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS tr_prevent_remove_last_owner ON public.team_members;
CREATE TRIGGER tr_prevent_remove_last_owner
  BEFORE UPDATE OF role OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_remove_last_owner();

-- 6. team_members: DELETE - owner/admin can remove others; any member can leave (trigger blocks last owner)
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
CREATE POLICY "team_members_delete_policy" ON public.team_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.can_manage_team_members(team_id, auth.uid())
  );

-- 7. teams: UPDATE - allow owner/admin (not just creator)
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
CREATE POLICY "teams_update_policy" ON public.teams
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR public.can_manage_team_members(id, auth.uid())
  );

-- 9. team_invites: invite by email (optional; for future invite flow)
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, email)
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_invites_select" ON public.team_invites;
CREATE POLICY "team_invites_select" ON public.team_invites
  FOR SELECT USING (public.can_manage_team_members(team_id, auth.uid()));
DROP POLICY IF EXISTS "team_invites_insert" ON public.team_invites;
CREATE POLICY "team_invites_insert" ON public.team_invites
  FOR INSERT WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));
DROP POLICY IF EXISTS "team_invites_delete" ON public.team_invites;
CREATE POLICY "team_invites_delete" ON public.team_invites
  FOR DELETE USING (public.can_manage_team_members(team_id, auth.uid()));
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);
