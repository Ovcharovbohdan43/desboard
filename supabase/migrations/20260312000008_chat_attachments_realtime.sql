-- Add chat_id to team_chat_message_attachments for realtime filter (recipient gets updates when files are uploaded)
ALTER TABLE public.team_chat_message_attachments
  ADD COLUMN IF NOT EXISTS chat_id uuid REFERENCES public.team_chats(id) ON DELETE CASCADE;

UPDATE public.team_chat_message_attachments a
SET chat_id = m.chat_id
FROM public.team_chat_messages m
WHERE a.message_id = m.id AND a.chat_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_chat_message_attachments_chat_id
  ON public.team_chat_message_attachments(chat_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_message_attachments;
