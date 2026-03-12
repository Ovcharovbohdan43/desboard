import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const BUCKET = "project-files";

export type TeamChatRow = Tables<"team_chats">;
export type TeamChatMessageRow = Tables<"team_chat_messages">;

export type TeamChatMessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  name: string;
  size_bytes: number;
  type: string;
  created_at: string;
};

export type TeamChatMessageWithAttachments = TeamChatMessageRow & {
  attachments: TeamChatMessageAttachment[];
  message_type?: string;
  system_action?: string | null;
  system_target_id?: string | null;
};

export type TeamChatLastMessage = {
  id: string;
  text: string;
  created_at: string;
  from_user_id: string;
};

export type TeamChatWithPreview = TeamChatRow & {
  last_message: TeamChatLastMessage | null;
  unread_count: number;
  other_user_id?: string | null; // for direct chats: the other participant
};

export type MessagesPreviewResult = {
  unreadCount: number;
  totalCount: number;
  recentChats: TeamChatWithPreview[];
};

/** Chats for current user in team (from RPC). */
export async function fetchTeamChats(teamId: string): Promise<TeamChatWithPreview[]> {
  const { data, error } = await supabase.rpc("get_team_chats_preview", {
    p_team_id: teamId,
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }
  const list = Array.isArray(data) ? data : [];
  return list as TeamChatWithPreview[];
}

/** Find or create direct chat with another user. Returns chat row. */
export async function fetchOrCreateDirectChat(
  teamId: string,
  otherUserId: string
): Promise<TeamChatRow> {
  const { data, error } = await supabase.rpc("fetch_or_create_direct_chat", {
    p_team_id: teamId,
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as TeamChatRow;
}

/** Create a channel. Creator is added as admin participant. Requires auth. */
export async function createChannel(
  teamId: string,
  name: string,
  creatorUserId: string
): Promise<TeamChatRow> {
  const chatInsert: TablesInsert<"team_chats"> = {
    team_id: teamId,
    type: "channel",
    name: name.trim() || "Channel",
  };
  const { data: chat, error: chatErr } = await supabase
    .from("team_chats")
    .insert(chatInsert)
    .select()
    .single();
  if (chatErr) throw chatErr;
  const { error: partErr } = await supabase
    .from("team_chat_participants")
    .insert({ chat_id: chat.id, user_id: creatorUserId, role: "admin" });
  if (partErr) throw partErr;
  return chat as TeamChatRow;
}

/** Add a user as participant to a channel. Inserts system message "X invited Y". */
export async function addChannelParticipant(
  chatId: string,
  userId: string,
  inviterUserId?: string
): Promise<void> {
  const { error } = await supabase
    .from("team_chat_participants")
    .insert({ chat_id: chatId, user_id: userId, role: "member" });
  if (error) throw error;

  const uid = inviterUserId ?? (await supabase.auth.getUser()).data.user?.id;
  if (uid) {
    await supabase.from("team_chat_messages").insert({
      chat_id: chatId,
      from_user_id: uid,
      text: "",
      message_type: "system",
      system_action: "member_invited",
      system_target_id: userId,
    });
  }
}

/** Remove a user from a channel. Inserts system message "X removed Y". Requires admin/owner. */
export async function removeChannelParticipant(
  chatId: string,
  userId: string,
  actorUserId?: string
): Promise<void> {
  const { error } = await supabase
    .from("team_chat_participants")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;

  const uid = actorUserId ?? (await supabase.auth.getUser()).data.user?.id;
  if (uid) {
    await supabase.from("team_chat_messages").insert({
      chat_id: chatId,
      from_user_id: uid,
      text: "",
      message_type: "system",
      system_action: "member_removed",
      system_target_id: userId,
    });
  }
}

/** Rename a channel. Inserts system message "X renamed channel to Y". */
export async function renameChannel(
  chatId: string,
  newName: string,
  actorUserId?: string
): Promise<void> {
  const { error } = await supabase
    .from("team_chats")
    .update({ name: newName.trim(), updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;

  const uid = actorUserId ?? (await supabase.auth.getUser()).data.user?.id;
  if (uid) {
    await supabase.from("team_chat_messages").insert({
      chat_id: chatId,
      from_user_id: uid,
      text: newName.trim(),
      message_type: "system",
      system_action: "channel_renamed",
      system_target_id: null,
    });
  }
}

/** Delete a chat (channel or direct). Cascades to participants, messages, attachments. */
export async function deleteChat(chatId: string): Promise<void> {
  const { error } = await supabase.from("team_chats").delete().eq("id", chatId);
  if (error) throw error;
}

/** Get participant user_ids for a chat (for invite flow). */
export async function fetchChatParticipantIds(chatId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("team_chat_participants")
    .select("user_id")
    .eq("chat_id", chatId);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id);
}

export type FetchChatMessagesOptions = {
  limit?: number;
  before?: string; // created_at cursor (ISO string)
};

/** Messages in a chat with attachments (chronological for display). Uses RPC to avoid RLS 403. */
export async function fetchChatMessages(
  chatId: string,
  options: FetchChatMessagesOptions = {}
): Promise<TeamChatMessageWithAttachments[]> {
  const { limit = 50, before } = options;
  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_chat_messages", {
    p_chat_id: chatId,
    p_limit: limit,
    p_before: before || null,
  });
  if (rpcErr) throw rpcErr;
  if (rpcData && typeof rpcData === "object" && "error" in rpcData) {
    throw new Error((rpcData as { error: string }).error);
  }
  const list = (Array.isArray(rpcData) ? rpcData : []) as TeamChatMessageRow[];

  const msgIds = list.map((m) => m.id);
  if (msgIds.length === 0) {
    return list.map((m) => ({ ...m, attachments: [] }));
  }

  const { data: attachments } = await supabase
    .from("team_chat_message_attachments")
    .select("*")
    .in("message_id", msgIds)
    .order("created_at", { ascending: true });

  const attByMsg = new Map<string, TeamChatMessageAttachment[]>();
  for (const a of (attachments ?? []) as TeamChatMessageAttachment[]) {
    const arr = attByMsg.get(a.message_id) ?? [];
    arr.push(a);
    attByMsg.set(a.message_id, arr);
  }

  return list.map((m) => ({
    ...m,
    attachments: attByMsg.get(m.id) ?? [],
  }));
}

export type SendMessageOptions = {
  files?: File[];
  teamId?: string;
};

/** Send a message; if files and teamId provided, uploads to Storage and saves attachment rows. */
export async function sendMessage(
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<TeamChatMessageRow> {
  const { files = [], teamId } = options;
  const insert: TablesInsert<"team_chat_messages"> = {
    chat_id: chatId,
    text: text.trim() || "",
  };
  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  const msg = data as TeamChatMessageRow;

  if (files.length > 0 && teamId) {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueName = `${crypto.randomUUID()}_${safeName}`;
      const storagePath = `${teamId}/team-chat/${chatId}/${msg.id}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const ext = file.name.split(".").pop() ?? "bin";
      await supabase.from("team_chat_message_attachments").insert({
        message_id: msg.id,
        chat_id: chatId,
        storage_path: storagePath,
        name: file.name,
        size_bytes: file.size,
        type: ext,
      });
    }
  }

  return msg;
}

/** Mark chat as read up to lastReadAt (ISO string). Caller must pass current userId (RLS allows team members to update any participant; we restrict to own row). */
export async function markChatAsRead(
  chatId: string,
  lastReadAt: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("team_chat_participants")
    .update({ last_read_at: lastReadAt })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Preview for dashboard card: unread total, chat count, recent chats. */
export async function fetchMessagesPreview(
  teamId: string
): Promise<MessagesPreviewResult> {
  const chats = await fetchTeamChats(teamId);
  const unreadCount = chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const recentChats = chats.slice(0, 5);
  return {
    unreadCount,
    totalCount: chats.length,
    recentChats,
  };
}

/** Signed URL for downloading an attachment (expires in seconds, default 60). */
export async function getAttachmentDownloadUrl(
  storagePath: string,
  expiresIn = 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to create signed URL");
  return data.signedUrl;
}
