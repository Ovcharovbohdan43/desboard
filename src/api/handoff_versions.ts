import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type HandoffVersion = Tables<"handoff_versions">;
export type HandoffVersionInsert = TablesInsert<"handoff_versions">;

export async function fetchHandoffVersions(projectId: string) {
  const { data, error } = await supabase
    .from("handoff_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as HandoffVersion[];
}

export async function createHandoffVersion(insert: HandoffVersionInsert) {
  const { data, error } = await supabase
    .from("handoff_versions")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as HandoffVersion;
}
