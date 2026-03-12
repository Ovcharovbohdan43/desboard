-- System messages for channel events (invite, remove, rename)
ALTER TABLE public.team_chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  ADD COLUMN IF NOT EXISTS system_action text CHECK (system_action IN ('member_invited', 'member_removed', 'channel_renamed')),
  ADD COLUMN IF NOT EXISTS system_target_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.team_chat_messages.message_type IS 'user = regular message, system = event';
COMMENT ON COLUMN public.team_chat_messages.system_action IS 'For system: member_invited, member_removed, channel_renamed';
COMMENT ON COLUMN public.team_chat_messages.system_target_id IS 'For invite/remove: target user_id; for rename: null (new name in text)';
