import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Milestone = Tables<"milestones">;
export type MilestoneInsert = TablesInsert<"milestones">;
export type MilestoneUpdate = TablesUpdate<"milestones">;

export async function fetchMilestones(projectId: string) {
  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data as Milestone[];
}

export async function createMilestone(insert: MilestoneInsert) {
  const { data, error } = await supabase
    .from("milestones")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Milestone;
}

export async function updateMilestone(id: string, update: MilestoneUpdate) {
  const { data, error } = await supabase
    .from("milestones")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Milestone;
}

export async function deleteMilestone(id: string) {
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) throw error;
}
