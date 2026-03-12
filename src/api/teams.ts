import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type TeamMemberRole = "owner" | "admin" | "member" | "guest";

export interface TeamMemberWithProfile extends TeamMember {
  profiles: { display_name: string | null; avatar_url: string | null; email?: string | null } | null;
}

/** Display name: display_name ?? email prefix ?? truncated user_id */
export function getMemberDisplayName(
  profile: { display_name?: string | null; email?: string | null } | null,
  userId: string
): string {
  if (profile?.display_name?.trim()) return profile.display_name.trim();
  if (profile?.email) return profile.email.split("@")[0] ?? userId.slice(0, 8);
  return userId.slice(0, 8);
}

export async function fetchTeams(userId: string) {
  const { data: created, error: e1 } = await supabase
    .from("teams")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (e1) throw e1;

  const { data: memberRows } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);
  if (!memberRows?.length) return (created ?? []) as Team[];

  const memberIds = memberRows.map((r) => r.team_id).filter((id) => !created?.some((t) => t.id === id));
  if (memberIds.length === 0) return (created ?? []) as Team[];

  const { data: memberTeams, error: e2 } = await supabase
    .from("teams")
    .select("*")
    .in("id", memberIds);
  if (e2) throw e2;

  const all = [...(created ?? []), ...(memberTeams ?? [])];
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all as Team[];
}

/** Fetch a single team by id. Returns null if not found or no access. */
export async function fetchTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw error;
  return data as Team | null;
}

export async function createTeam(name: string, userId: string) {
  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "owner",
  });
  if (memberError) throw memberError;

  return team as Team;
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  if (!members?.length) return [];
  const userIds = [...new Set(members.map((m) => m.user_id))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, email")
    .in("user_id", userIds);
  const profileMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
  return members.map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      ...m,
      profiles: p ? { display_name: p.display_name, avatar_url: p.avatar_url, email: (p as { email?: string }).email } : null,
    };
  }) as TeamMemberWithProfile[];
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: TeamMemberRole = "member"
) {
  const { data, error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, role })
    .select()
    .single();
  if (error) throw error;
  return data as TeamMember;
}

export async function updateTeamMemberRole(
  teamId: string,
  memberId: string,
  role: TeamMemberRole
) {
  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", memberId)
    .eq("team_id", teamId)
    .select()
    .single();
  if (error) throw error;
  return data as TeamMember;
}

/** Current user's role in team, or null if not a member. Creator = owner. */
export async function getMyTeamRole(
  teamId: string,
  userId: string
): Promise<TeamMemberRole | null> {
  const { data: team } = await supabase
    .from("teams")
    .select("created_by")
    .eq("id", teamId)
    .single();
  if (team?.created_by === userId) return "owner";
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  return (data?.role as TeamMemberRole) ?? null;
}

export function canManageMembers(role: TeamMemberRole | null): boolean {
  return role === "owner" || role === "admin";
}

export async function updateTeam(teamId: string, update: { name?: string }) {
  const { data, error } = await supabase
    .from("teams")
    .update(update)
    .eq("id", teamId)
    .select()
    .single();
  if (error) throw error;
  return data as Team;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export async function fetchTeamInvites(teamId: string): Promise<TeamInvite[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamInvite[];
}

export async function createTeamInvite(
  teamId: string,
  email: string,
  role: "admin" | "member" | "guest",
  invitedBy: string
): Promise<TeamInvite> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("team_invites")
    .insert({
      team_id: teamId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TeamInvite;
}

export async function deleteTeamInvite(teamId: string, inviteId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("team_invites")
    .delete()
    .eq("id", inviteId)
    .eq("team_id", teamId);
  if (error) throw error;
}

/** Invoke Edge Function to send invite email via Resend. Call after createTeamInvite. */
export async function sendInviteEmail(inviteId: string): Promise<{ ok: boolean; error?: string }> {
  const appUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke("send-invite-email", {
    body: { inviteId, appUrl },
  });
  if (error) {
    let errMsg = error.message;
    if (error instanceof FunctionsHttpError && error.context) {
      try {
        const body = (await error.context.json()) as { error?: string } | null;
        if (body?.error) errMsg = body.error;
      } catch {
        // ignore
      }
    }
    return { ok: false, error: errMsg };
  }
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result || !result.ok) {
    return { ok: false, error: result?.error ?? "Failed to send email" };
  }
  return { ok: true };
}

export async function acceptTeamInvite(token: string): Promise<{ ok: boolean; team_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("accept_team_invite", { p_token: token });
  if (error) throw error;
  const result = data as { ok: boolean; team_id?: string; error?: string } | null;
  return result ?? { ok: false, error: "Unknown error" };
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);
  if (error) throw error;
}
