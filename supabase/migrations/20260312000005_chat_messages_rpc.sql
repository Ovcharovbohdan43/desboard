-- Trigger: set from_user_id = auth.uid() on INSERT (client may omit it)
CREATE OR REPLACE FUNCTION public.team_chat_messages_set_from_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.from_user_id := COALESCE(NEW.from_user_id, auth.uid());
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS team_chat_messages_set_from_user_trigger ON public.team_chat_messages;
CREATE TRIGGER team_chat_messages_set_from_user_trigger
  BEFORE INSERT ON public.team_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.team_chat_messages_set_from_user();

-- RPC to fetch chat messages, bypassing RLS for consistent participant check.
-- Fixes 403 on team_chat_messages select when RLS subqueries fail.
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
    SELECT id, chat_id, from_user_id, text, created_at
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

COMMENT ON FUNCTION public.get_chat_messages(uuid, int, timestamptz) IS
  'Returns messages for a chat. Caller must be a participant.';
