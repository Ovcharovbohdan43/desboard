import { supabase } from "@/integrations/supabase/client";

export type Theme = "light" | "dark" | "system";

export interface UserSettings {
  user_id: string;
  theme: Theme;
  language: string;
  notifications: { email?: boolean; in_app?: boolean };
  updated_at: string;
}

export type UserSettingsUpdate = Partial<Pick<UserSettings, "theme" | "language" | "notifications">>;

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserSettings | null;
}

export async function upsertUserSettings(userId: string, update: UserSettingsUpdate): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...update,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as UserSettings;
}
