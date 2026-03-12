import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchClientMessages,
  createClientMessage,
  createClientMessageWithAttachments,
} from "@/api/client_messages";
import type { ClientMessageInsert } from "@/api/client_messages";

export const clientMessagesQueryKey = (projectId: string) =>
  ["client_messages", projectId] as const;

export function useClientMessages(projectId: string | null) {
  return useQuery({
    queryKey: clientMessagesQueryKey(projectId ?? ""),
    queryFn: () => fetchClientMessages(projectId!),
    enabled: !!projectId,
  });
}

export type SendClientMessageParams = ClientMessageInsert & {
  files?: File[];
  teamId?: string;
};

export function useSendClientMessage(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ files, teamId, ...insert }: SendClientMessageParams) => {
      if (files?.length && teamId && projectId) {
        return createClientMessageWithAttachments(insert, files, teamId, projectId);
      }
      return createClientMessage(insert);
    },
    onSuccess: () => {
      if (projectId) {
        qc.invalidateQueries({ queryKey: clientMessagesQueryKey(projectId) });
        qc.invalidateQueries({ queryKey: ["handoff", projectId] });
      }
    },
  });
}
