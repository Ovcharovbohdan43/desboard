import { supabase } from "@/integrations/supabase/client";

export interface ProjectTemplate {
  id: string;
  team_id: string;
  name: string;
  category: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplateInsert {
  team_id: string;
  name: string;
  category?: string;
  config?: Record<string, unknown>;
}

export interface ProjectTemplateUpdate {
  name?: string;
  category?: string;
  config?: Record<string, unknown>;
}

export async function fetchProjectTemplates(teamId: string): Promise<ProjectTemplate[]> {
  const { data, error } = await supabase
    .from("project_templates")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectTemplate[];
}

export async function createProjectTemplate(
  insert: ProjectTemplateInsert
): Promise<ProjectTemplate> {
  const row = {
    ...insert,
    category: insert.category ?? "General",
    config: insert.config ?? {},
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("project_templates")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectTemplate;
}

export async function updateProjectTemplate(
  id: string,
  update: ProjectTemplateUpdate
): Promise<ProjectTemplate> {
  const { data, error } = await supabase
    .from("project_templates")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectTemplate;
}

export async function deleteProjectTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("project_templates").delete().eq("id", id);
  if (error) throw error;
}
