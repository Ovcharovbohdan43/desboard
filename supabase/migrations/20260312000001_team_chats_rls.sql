-- RLS for Phase 6 Messages: team_chats, team_chat_participants, team_chat_messages, team_chat_message_attachments

ALTER TABLE public.team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_message_attachments ENABLE ROW LEVEL SECURITY;

-- team_chats: only team members can access
CREATE POLICY "team_chats_select" ON public.team_chats FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "team_chats_insert" ON public.team_chats FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "team_chats_update" ON public.team_chats FOR UPDATE
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "team_chats_delete" ON public.team_chats FOR DELETE
  USING (public.is_team_member(team_id, auth.uid()));

-- team_chat_participants: select if participant or team member; mutate only team member
CREATE POLICY "team_chat_participants_select" ON public.team_chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chats c
      WHERE c.id = team_chat_participants.chat_id
        AND (public.is_team_member(c.team_id, auth.uid()) OR team_chat_participants.user_id = auth.uid())
    )
  );
CREATE POLICY "team_chat_participants_insert" ON public.team_chat_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_chats c
      WHERE c.id = team_chat_participants.chat_id AND public.is_team_member(c.team_id, auth.uid())
    )
  );
CREATE POLICY "team_chat_participants_update" ON public.team_chat_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chats c
      WHERE c.id = team_chat_participants.chat_id AND public.is_team_member(c.team_id, auth.uid())
    )
  );
CREATE POLICY "team_chat_participants_delete" ON public.team_chat_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chats c
      WHERE c.id = team_chat_participants.chat_id AND public.is_team_member(c.team_id, auth.uid())
    )
  );

-- team_chat_messages: select if participant; insert if participant and sender = auth.uid(); update/delete own only
CREATE POLICY "team_chat_messages_select" ON public.team_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chat_participants p
      WHERE p.chat_id = team_chat_messages.chat_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "team_chat_messages_insert" ON public.team_chat_messages FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_chat_participants p
      WHERE p.chat_id = team_chat_messages.chat_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "team_chat_messages_update" ON public.team_chat_messages FOR UPDATE
  USING (from_user_id = auth.uid());
CREATE POLICY "team_chat_messages_delete" ON public.team_chat_messages FOR DELETE
  USING (from_user_id = auth.uid());

-- team_chat_message_attachments: same access as messages (via chat -> team)
CREATE POLICY "team_chat_message_attachments_select" ON public.team_chat_message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chat_messages m
      JOIN public.team_chat_participants p ON p.chat_id = m.chat_id AND p.user_id = auth.uid()
      WHERE m.id = team_chat_message_attachments.message_id
    )
  );
CREATE POLICY "team_chat_message_attachments_insert" ON public.team_chat_message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_chat_messages m
      JOIN public.team_chat_participants p ON p.chat_id = m.chat_id AND p.user_id = auth.uid()
      WHERE m.id = team_chat_message_attachments.message_id
    )
  );
CREATE POLICY "team_chat_message_attachments_delete" ON public.team_chat_message_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chat_messages m
      WHERE m.id = team_chat_message_attachments.message_id AND m.from_user_id = auth.uid()
    )
  );
