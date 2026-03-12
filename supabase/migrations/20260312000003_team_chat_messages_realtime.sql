-- Enable Realtime for team_chat_messages (Phase 5: live updates for new messages)
-- Required for postgres_changes subscription. Skip if your project enables Realtime via Dashboard.

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
