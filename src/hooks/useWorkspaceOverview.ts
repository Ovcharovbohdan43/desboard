import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceOverview } from "@/api/workspaceOverview";

export const workspaceOverviewQueryKey = (teamId: string) =>
  ["workspace_overview", teamId] as const;

const STALE_TIME_MS = 90 * 1000; // 1.5 min

export function useWorkspaceOverview(teamId: string | null) {
  return useQuery({
    queryKey: workspaceOverviewQueryKey(teamId ?? ""),
    queryFn: () => fetchWorkspaceOverview(teamId!),
    enabled: !!teamId,
    staleTime: STALE_TIME_MS,
  });
}
