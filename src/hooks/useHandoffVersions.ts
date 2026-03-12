import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHandoffVersions, createHandoffVersion } from "@/api/handoff_versions";
import type { HandoffVersionInsert } from "@/api/handoff_versions";

export const handoffVersionsQueryKey = (projectId: string) =>
  ["handoff_versions", projectId] as const;

export function useHandoffVersions(projectId: string | null) {
  return useQuery({
    queryKey: handoffVersionsQueryKey(projectId ?? ""),
    queryFn: () => fetchHandoffVersions(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateHandoffVersion(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: HandoffVersionInsert) => createHandoffVersion(insert),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: handoffVersionsQueryKey(projectId) });
      if (projectId) qc.invalidateQueries({ queryKey: ["handoff", projectId] });
    },
  });
}
