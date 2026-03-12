-- Allow reading profiles of users who share a team with the current user.
-- Enables display_name/avatar_url in Messages, Workspace, Settings, etc.
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id AND tm2.user_id = auth.uid()
      WHERE tm1.user_id = profiles.user_id
    )
  );
