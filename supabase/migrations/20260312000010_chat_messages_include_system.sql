-- Include system message columns in get_chat_messages RPC
CREATE OR REPLACE FUNCTION public.get_chat_messages(p_chat_id uuid, p_limit int DEFAULT 50, p_before timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.team_chat_participants p
    WHERE p.chat_id = p_chat_id AND p.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  WITH msgs AS (
    SELECT id, chat_id, from_user_id, text, created_at,
           COALESCE(message_type, 'user') AS message_type,
           system_action, system_target_id
    FROM public.team_chat_messages
    WHERE chat_id = p_chat_id
      AND (p_before IS NULL OR created_at < p_before)
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.created_at ASC), '[]'::jsonb) INTO v_result
  FROM msgs m;

  RETURN v_result;
END;
$$;
