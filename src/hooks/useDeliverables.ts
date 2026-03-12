import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDeliverables,
  fetchDeliverablesByTeam,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
} from "@/api/deliverables";
import type { DeliverableInsert, DeliverableUpdate } from "@/api/deliverables";

export const deliverablesQueryKey = (projectId: string) => ["deliverables", projectId] as const;
export const deliverablesByTeamQueryKey = (teamId: string) =>
  ["deliverables_by_team", teamId] as const;

export function useDeliverables(projectId: string | null) {
  return useQuery({
    queryKey: deliverablesQueryKey(projectId ?? ""),
    queryFn: () => fetchDeliverables(projectId!),
    enabled: !!projectId,
  });
}

export function useDeliverablesByTeam(teamId: string | null) {
  return useQuery({
    queryKey: deliverablesByTeamQueryKey(teamId ?? ""),
    queryFn: () => fetchDeliverablesByTeam(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateDeliverable(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: DeliverableInsert) => createDeliverable(insert),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: deliverablesQueryKey(projectId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "deliverables_by_team" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}

export function useUpdateDeliverable(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: DeliverableUpdate }) =>
      updateDeliverable(id, update),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: deliverablesQueryKey(projectId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "deliverables_by_team" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}

export function useDeleteDeliverable(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeliverable(id),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: deliverablesQueryKey(projectId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "deliverables_by_team" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}
