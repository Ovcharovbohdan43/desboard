-- Enable RLS on existing tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- teams: creator and members can read
CREATE POLICY "teams_select_policy" ON public.teams
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert_policy" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_update_policy" ON public.teams
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- team_members: members of the team can read
CREATE POLICY "team_members_select_policy" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND (t.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm2
        WHERE tm2.team_id = t.id AND tm2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "team_members_insert_policy" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND (t.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm2
        WHERE tm2.team_id = t.id AND tm2.user_id = auth.uid() AND tm2.role IN ('owner', 'admin')
      ))
    )
  );

-- profiles: users can read/update own profile
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- transactions: team members can access
CREATE POLICY "transactions_select_policy" ON public.transactions
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "transactions_insert_policy" ON public.transactions
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "transactions_update_policy" ON public.transactions
  FOR UPDATE USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "transactions_delete_policy" ON public.transactions
  FOR DELETE USING (
    public.is_team_member(team_id, auth.uid())
  );

-- expense_categories: team members can access
CREATE POLICY "expense_categories_select_policy" ON public.expense_categories
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "expense_categories_update_policy" ON public.expense_categories
  FOR UPDATE USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories
  FOR DELETE USING (
    public.is_team_member(team_id, auth.uid())
  );

-- income_sources: team members can access
CREATE POLICY "income_sources_select_policy" ON public.income_sources
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "income_sources_insert_policy" ON public.income_sources
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "income_sources_update_policy" ON public.income_sources
  FOR UPDATE USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "income_sources_delete_policy" ON public.income_sources
  FOR DELETE USING (
    public.is_team_member(team_id, auth.uid())
  );
