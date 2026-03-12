-- Phase 6 Messages: team chats, participants, messages, attachments
-- Path: {team_id}/team-chat/{chat_id}/{message_id}/{filename} in bucket project-files (existing policies apply)

-- team_chats (direct or channel)
CREATE TABLE IF NOT EXISTS public.team_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'channel')),
  name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- team_chat_participants (participants + last read marker)
CREATE TABLE IF NOT EXISTS public.team_chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.team_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at timestamptz,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(chat_id, user_id)
);

-- team_chat_messages
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.team_chats(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- team_chat_message_attachments (metadata; files in project-files bucket)
CREATE TABLE IF NOT EXISTS public.team_chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.team_chat_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  name text NOT NULL,
  size_bytes bigint DEFAULT 0,
  type text DEFAULT 'file',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_chats_team_id ON public.team_chats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_participants_chat_id ON public.team_chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_participants_user_id ON public.team_chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_chat_id ON public.team_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_chat_created ON public.team_chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_team_chat_message_attachments_message_id ON public.team_chat_message_attachments(message_id);
