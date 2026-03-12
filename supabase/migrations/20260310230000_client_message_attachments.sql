-- Client message attachments (file attachments in chat)
-- Allow empty text for file-only messages

ALTER TABLE public.client_messages
  ALTER COLUMN text SET DEFAULT '';

-- Create table for message attachments
CREATE TABLE IF NOT EXISTS public.client_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.client_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  name text NOT NULL,
  size_bytes bigint DEFAULT 0,
  type text DEFAULT 'file',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_message_attachments_message_id
  ON public.client_message_attachments(message_id);

ALTER TABLE public.client_message_attachments ENABLE ROW LEVEL SECURITY;

-- Same access as client_messages (via project)
CREATE POLICY "client_message_attachments_select" ON public.client_message_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_messages cm
    JOIN public.projects p ON p.id = cm.project_id
    WHERE cm.id = client_message_attachments.message_id
      AND public.is_team_member(p.team_id, auth.uid())
  )
);
CREATE POLICY "client_message_attachments_insert" ON public.client_message_attachments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_messages cm
    JOIN public.projects p ON p.id = cm.project_id
    WHERE cm.id = client_message_attachments.message_id
      AND public.is_team_member(p.team_id, auth.uid())
  )
);
CREATE POLICY "client_message_attachments_delete" ON public.client_message_attachments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.client_messages cm
    JOIN public.projects p ON p.id = cm.project_id
    WHERE cm.id = client_message_attachments.message_id
      AND public.is_team_member(p.team_id, auth.uid())
  )
);
