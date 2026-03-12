import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/api/milestones";
import type { MilestoneInsert, MilestoneUpdate } from "@/api/milestones";

export const milestonesQueryKey = (projectId: string) => ["milestones", projectId] as const;

export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: milestonesQueryKey(projectId ?? ""),
    queryFn: () => fetchMilestones(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateMilestone(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: MilestoneInsert) => createMilestone(insert),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: milestonesQueryKey(variables.project_id) });
    },
  });
}

export function useUpdateMilestone(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: MilestoneUpdate }) =>
      updateMilestone(id, update),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: milestonesQueryKey(projectId) });
    },
  });
}

export function useDeleteMilestone(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: milestonesQueryKey(projectId) });
    },
  });
}
