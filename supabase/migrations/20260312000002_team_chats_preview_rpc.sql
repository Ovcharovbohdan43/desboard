-- Phase 6 Messages: RPCs for team chats preview and fetch-or-create direct chat

-- get_team_chats_preview: list chats for current user in team with last_message and unread_count
CREATE OR REPLACE FUNCTION public.get_team_chats_preview(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_team_member(p_team_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  WITH my_chats AS (
    SELECT c.id AS chat_id, c.team_id, c.type, c.name, c.created_at, c.updated_at, p.last_read_at
    FROM public.team_chat_participants p
    JOIN public.team_chats c ON c.id = p.chat_id
    WHERE p.user_id = auth.uid() AND c.team_id = p_team_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.chat_id) m.chat_id, m.id AS msg_id, m.text AS msg_text, m.created_at AS msg_at, m.from_user_id
    FROM public.team_chat_messages m
    WHERE m.chat_id IN (SELECT chat_id FROM my_chats)
    ORDER BY m.chat_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.chat_id, COUNT(*)::int AS cnt
    FROM public.team_chat_messages m
    JOIN my_chats c ON c.chat_id = m.chat_id
    WHERE m.created_at > COALESCE(c.last_read_at, '1970-01-01'::timestamptz)
      AND m.from_user_id != auth.uid()
    GROUP BY m.chat_id
  ),
  combined AS (
    SELECT
      c.chat_id, c.team_id, c.type, c.name, c.created_at, c.updated_at,
      l.msg_id, l.msg_text, l.msg_at, l.from_user_id,
      COALESCE(u.cnt, 0) AS unread_count,
      COALESCE(l.msg_at, c.created_at) AS sort_at,
      (SELECT p.user_id FROM public.team_chat_participants p WHERE p.chat_id = c.chat_id AND p.user_id != auth.uid() AND c.type = 'direct' LIMIT 1) AS other_user_id
    FROM my_chats c
    LEFT JOIN last_msgs l ON l.chat_id = c.chat_id
    LEFT JOIN unread u ON u.chat_id = c.chat_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', chat_id,
      'team_id', team_id,
      'type', type,
      'name', name,
      'created_at', created_at,
      'updated_at', updated_at,
      'last_message', CASE
        WHEN msg_id IS NOT NULL THEN jsonb_build_object('id', msg_id, 'text', msg_text, 'created_at', msg_at, 'from_user_id', from_user_id)
        ELSE NULL
      END,
      'unread_count', unread_count,
      'other_user_id', other_user_id
    )
    ORDER BY sort_at DESC NULLS LAST
  ) INTO v_result
  FROM combined;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_team_chats_preview(uuid) IS
  'Returns chats for current user in team with last_message and unread_count. RLS: team members only.';

-- fetch_or_create_direct_chat: find existing direct chat between current user and other, or create one
CREATE OR REPLACE FUNCTION public.fetch_or_create_direct_chat(p_team_id uuid, p_other_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
  v_chat record;
BEGIN
  IF NOT public.is_team_member(p_team_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF p_other_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'cannot chat with self');
  END IF;
  IF NOT public.is_team_member(p_team_id, p_other_user_id) THEN
    RETURN jsonb_build_object('error', 'other user is not a team member');
  END IF;

  -- Find existing direct chat
  SELECT c.id INTO v_chat_id
  FROM public.team_chats c
  WHERE c.team_id = p_team_id AND c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.team_chat_participants p WHERE p.chat_id = c.id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.team_chat_participants p WHERE p.chat_id = c.id AND p.user_id = p_other_user_id)
    AND (SELECT COUNT(*) FROM public.team_chat_participants WHERE chat_id = c.id) = 2
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    SELECT * INTO v_chat FROM public.team_chats WHERE id = v_chat_id;
    RETURN to_jsonb(v_chat);
  END IF;

  -- Create new direct chat
  INSERT INTO public.team_chats (team_id, type)
  VALUES (p_team_id, 'direct')
  RETURNING * INTO v_chat;

  INSERT INTO public.team_chat_participants (chat_id, user_id)
  VALUES (v_chat.id, auth.uid()), (v_chat.id, p_other_user_id);

  RETURN to_jsonb(v_chat);
END;
$$;

COMMENT ON FUNCTION public.fetch_or_create_direct_chat(uuid, uuid) IS
  'Returns existing direct chat between current user and other, or creates one. RLS: team members only.';
