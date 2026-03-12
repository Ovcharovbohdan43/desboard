import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const AVATARS_BUCKET = "avatars";

export type Profile = Tables<"profiles">;

export interface ProfileUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `${userId}/avatar.${safeExt}`;

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(storagePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
