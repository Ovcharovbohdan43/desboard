import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getMyTeamRole,
  type TeamMemberRole,
} from "@/api/teams";
import { useAuthContext } from "@/contexts/AuthContext";
import { teamsQueryKey } from "@/hooks/useTeams";

export const teamMembersQueryKey = (teamId: string) =>
  ["team_members", teamId] as const;
export const myTeamRoleQueryKey = (teamId: string, userId: string) =>
  ["my_team_role", teamId, userId] as const;

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: teamMembersQueryKey(teamId ?? ""),
    queryFn: () => fetchTeamMembers(teamId!),
    enabled: !!teamId,
  });
}

export function useMyTeamRole(teamId: string | null) {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: myTeamRoleQueryKey(teamId ?? "", user?.id ?? ""),
    queryFn: () => getMyTeamRole(teamId!, user!.id),
    enabled: !!teamId && !!user?.id,
  });
}

export function useAddTeamMember(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: { userId: string; role?: TeamMemberRole }) =>
      addTeamMember(teamId!, userId, role ?? "member"),
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: teamMembersQueryKey(teamId) });
    },
  });
}

export function useUpdateTeamMemberRole(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: { memberId: string; role: TeamMemberRole }) =>
      updateTeamMemberRole(teamId!, memberId, role),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamMembersQueryKey(teamId) });
      }
    },
  });
}

export function useRemoveTeamMember(teamId: string | null) {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeTeamMember(teamId!, memberId),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: teamMembersQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: myTeamRoleQueryKey(teamId, user?.id ?? "") });
        if (user?.id) qc.invalidateQueries({ queryKey: teamsQueryKey(user.id) });
      }
    },
  });
}
