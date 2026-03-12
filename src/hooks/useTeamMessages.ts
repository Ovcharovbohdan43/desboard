import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamChats,
  fetchOrCreateDirectChat,
  fetchChatMessages,
  sendMessage,
  markChatAsRead,
  fetchMessagesPreview,
  createChannel,
  addChannelParticipant,
  removeChannelParticipant,
  renameChannel,
  deleteChat,
  fetchChatParticipantIds,
} from "@/api/team_messages";
import type { TeamChatRow, FetchChatMessagesOptions } from "@/api/team_messages";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export const teamChatsQueryKey = (teamId: string) =>
  ["team_chats", teamId] as const;
export const chatMessagesQueryKey = (chatId: string) =>
  ["team_chat_messages", chatId] as const;
export const messagesPreviewQueryKey = (teamId: string) =>
  ["messages_preview", teamId] as const;

export function useTeamChats(teamId: string | null) {
  return useQuery({
    queryKey: teamChatsQueryKey(teamId ?? ""),
    queryFn: () => fetchTeamChats(teamId!),
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
}

export function useChatMessages(
  chatId: string | null,
  options: FetchChatMessagesOptions = {}
) {
  return useQuery({
    queryKey: [...chatMessagesQueryKey(chatId ?? ""), options],
    queryFn: () => fetchChatMessages(chatId!, options),
    enabled: !!chatId,
    staleTime: 30 * 1000,
  });
}

export function useSendMessage(chatId: string | null, teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { text: string; files?: File[] }) =>
      sendMessage(chatId!, params.text, {
        files: params.files,
        teamId: teamId ?? undefined,
      }),
    onSuccess: () => {
      if (chatId) {
        qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
      }
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useMarkChatAsRead(
  chatId: string | null,
  teamId: string | null,
  userId: string | null
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lastReadAt: string) =>
      markChatAsRead(chatId!, lastReadAt, userId!),
    onSuccess: () => {
      if (chatId) {
        qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
      }
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useMessagesPreview(teamId: string | null) {
  return useQuery({
    queryKey: messagesPreviewQueryKey(teamId ?? ""),
    queryFn: () => fetchMessagesPreview(teamId!),
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
}

export function useCreateChannel(teamId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: (name: string) => createChannel(teamId!, name, user!.id),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export const chatParticipantsQueryKey = (chatId: string) =>
  ["chat_participants", chatId] as const;

export function useChatParticipants(chatId: string | null) {
  return useQuery({
    queryKey: chatParticipantsQueryKey(chatId ?? ""),
    queryFn: () => fetchChatParticipantIds(chatId!),
    enabled: !!chatId,
  });
}

export function useAddChannelParticipant(chatId: string | null, teamId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: (userId: string) =>
      addChannelParticipant(chatId!, userId, user?.id ?? undefined),
    onSuccess: () => {
      if (chatId) {
        qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
        qc.invalidateQueries({ queryKey: chatParticipantsQueryKey(chatId) });
      }
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useRemoveChannelParticipant(chatId: string | null, teamId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: (userId: string) =>
      removeChannelParticipant(chatId!, userId, user?.id ?? undefined),
    onSuccess: () => {
      if (chatId) {
        qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
        qc.invalidateQueries({ queryKey: chatParticipantsQueryKey(chatId) });
      }
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useRenameChannel(chatId: string | null, teamId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: (newName: string) =>
      renameChannel(chatId!, newName, user?.id ?? undefined),
    onSuccess: () => {
      if (chatId) qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useDeleteChat(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => deleteChat(chatId),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

export function useFetchOrCreateDirectChat(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) =>
      fetchOrCreateDirectChat(teamId!, otherUserId),
    onSuccess: (_data: TeamChatRow) => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
      }
    },
  });
}

/** Realtime subscription for new messages in a chat. Invalidates queries on INSERT. */
export function useTeamChatRealtime(
  chatId: string | null,
  teamId: string | null
) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!chatId || !teamId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const onInvalidate = () => {
      qc.invalidateQueries({ queryKey: chatMessagesQueryKey(chatId) });
      qc.invalidateQueries({ queryKey: teamChatsQueryKey(teamId) });
      qc.invalidateQueries({ queryKey: messagesPreviewQueryKey(teamId) });
    };

    const channel = supabase
      .channel(`team-chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        onInvalidate
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_message_attachments",
          filter: `chat_id=eq.${chatId}`,
        },
        onInvalidate
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, teamId, qc]);
}
