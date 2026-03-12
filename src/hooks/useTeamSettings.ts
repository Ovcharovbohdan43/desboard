import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamSettings,
  upsertTeamSettings,
  type TeamSettingsUpdate,
} from "@/api/teamSettings";

export const teamSettingsQueryKey = (teamId: string) =>
  ["team_settings", teamId] as const;

export function useTeamSettings(teamId: string | null) {
  return useQuery({
    queryKey: teamSettingsQueryKey(teamId ?? ""),
    queryFn: () => fetchTeamSettings(teamId!),
    enabled: !!teamId,
  });
}

export function useUpdateTeamSettings(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: TeamSettingsUpdate) =>
      upsertTeamSettings(teamId!, update),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamSettingsQueryKey(teamId) });
      }
    },
  });
}
