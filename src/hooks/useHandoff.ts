import { useQuery } from "@tanstack/react-query";
import { fetchHandoffData } from "@/api/handoff";

export const handoffQueryKey = (projectId: string) => ["handoff", projectId] as const;

export function useHandoffData(projectId: string | null) {
  return useQuery({
    queryKey: handoffQueryKey(projectId ?? ""),
    queryFn: () => fetchHandoffData(projectId!),
    enabled: !!projectId,
  });
}
