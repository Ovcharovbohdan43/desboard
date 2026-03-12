import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamInvites,
  createTeamInvite,
  deleteTeamInvite,
} from "@/api/teams";
import { useAuthContext } from "@/contexts/AuthContext";

export const teamInvitesQueryKey = (teamId: string) =>
  ["team_invites", teamId] as const;

export function useTeamInvites(teamId: string | null) {
  return useQuery({
    queryKey: teamInvitesQueryKey(teamId ?? ""),
    queryFn: () => fetchTeamInvites(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateTeamInvite(teamId: string | null) {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      email,
      role,
    }: { email: string; role?: "admin" | "member" | "guest" }) =>
      createTeamInvite(teamId!, email, role ?? "member", user!.id),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamInvitesQueryKey(teamId) });
      }
    },
  });
}

export function useDeleteTeamInvite(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => deleteTeamInvite(teamId!, inviteId),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamInvitesQueryKey(teamId) });
      }
    },
  });
}
