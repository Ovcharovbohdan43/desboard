import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam, updateTeam, fetchTeam } from "@/api/teams";
import { useAuthContext } from "@/contexts/AuthContext";

export const teamsQueryKey = (userId: string) => ["teams", userId] as const;
export const teamQueryKey = (teamId: string) => ["team", teamId] as const;

export function useTeams() {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: teamsQueryKey(user?.id ?? ""),
    queryFn: () => fetchTeams(user!.id),
    enabled: !!user?.id,
  });
}

export function useTeam(teamId: string | null) {
  return useQuery({
    queryKey: teamQueryKey(teamId ?? ""),
    queryFn: () => fetchTeam(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTeam(name, user!.id),
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: teamsQueryKey(user.id) });
      }
    },
  });
}

export function useUpdateTeam() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, update }: { teamId: string; update: { name?: string } }) =>
      updateTeam(teamId, update),
    onSuccess: (_, { teamId }) => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: teamsQueryKey(user.id) });
        qc.invalidateQueries({ queryKey: teamQueryKey(teamId) });
      }
    },
  });
}
