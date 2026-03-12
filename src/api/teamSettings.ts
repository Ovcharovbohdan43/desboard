import { supabase } from "@/integrations/supabase/client";

export interface RolePermissions {
  member?: { can_invite?: boolean };
  guest?: { can_view_invoices?: boolean };
}

export interface TeamSettings {
  team_id: string;
  primary_color: string;
  logo_url: string | null;
  font_family: string;
  meta: Record<string, unknown> & { role_permissions?: RolePermissions };
  updated_at: string;
}

export type TeamSettingsUpdate = Partial<
  Pick<TeamSettings, "primary_color" | "logo_url" | "font_family" | "meta">
>;

export async function fetchTeamSettings(teamId: string): Promise<TeamSettings | null> {
  const { data, error } = await supabase
    .from("team_settings")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw error;
  return data as TeamSettings | null;
}

export async function upsertTeamSettings(
  teamId: string,
  update: TeamSettingsUpdate
): Promise<TeamSettings> {
  const { data, error } = await supabase
    .from("team_settings")
    .upsert(
      {
        team_id: teamId,
        ...update,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as TeamSettings;
}
