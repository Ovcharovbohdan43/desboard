import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export async function fetchTasks(projectId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Task[];
}

export async function createTask(insert: TaskInsert) {
  const { data, error } = await supabase
    .from("tasks")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, update: TaskUpdate) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
