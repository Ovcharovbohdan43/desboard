-- RPC: accept team invite by token
-- User must be logged in; invite email must match user's email (case-insensitive)

CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User email not found');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite not found or expired');
  END IF;

  IF lower(trim(v_invite.email)) != lower(trim(v_user_email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite is for a different email address');
  END IF;

  -- Add user to team
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, auth.uid(), v_invite.role)
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = v_invite.role;

  DELETE FROM public.team_invites WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;
