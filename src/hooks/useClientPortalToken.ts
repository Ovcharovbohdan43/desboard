import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchClientPortalByToken,
  submitClientFeedbackByToken,
  updateDeliverableByToken,
  createProjectAccessToken,
} from "@/api/clientPortalToken";

export const clientPortalTokenQueryKey = (identifier: string, token: string) =>
  ["client_portal_token", identifier, token] as const;

export function useClientPortalByToken(identifier: string | null, token: string | null) {
  return useQuery({
    queryKey: clientPortalTokenQueryKey(identifier ?? "", token ?? ""),
    queryFn: () => fetchClientPortalByToken(identifier!, token!),
    enabled: !!identifier && !!token,
  });
}

export function useSubmitClientFeedbackByToken(
  projectId: string | null,
  token: string | null
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: {
      message?: string;
      handoffStatus?: "approved" | "pending" | "changes";
      handoffRating?: number;
      senderName?: string;
    }) =>
      submitClientFeedbackByToken(projectId!, token!, opts),
    onSuccess: (_, __, ctx) => {
      if (projectId && token) {
        qc.invalidateQueries({
          queryKey: clientPortalTokenQueryKey(projectId, token),
        });
      }
    },
  });
}

export function useUpdateDeliverableByToken(
  projectId: string | null,
  token: string | null
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliverableId, completed }: { deliverableId: string; completed: boolean }) =>
      updateDeliverableByToken(projectId!, token!, deliverableId, completed),
    onSuccess: () => {
      if (projectId && token) {
        qc.invalidateQueries({
          queryKey: clientPortalTokenQueryKey(projectId, token),
        });
      }
    },
  });
}

export function useCreateProjectAccessToken() {
  return useMutation({
    mutationFn: ({
      projectId,
      expiresDays = 30,
    }: {
      projectId: string;
      expiresDays?: number;
    }) => createProjectAccessToken(projectId, expiresDays),
  });
}
