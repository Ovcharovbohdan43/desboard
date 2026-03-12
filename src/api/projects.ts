import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;

export type ProjectWithDetails = Project & {
  clients: { name: string } | null;
  tasks: import("./tasks").Task[];
  milestones: import("./milestones").Milestone[];
};

export async function fetchProjects(teamId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      clients(name),
      tasks(*),
      milestones(*)
    `)
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as ProjectWithDetails[];
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      clients(name),
      tasks(*),
      milestones(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ProjectWithDetails;
}

export async function createProject(insert: ProjectInsert) {
  const { data, error } = await supabase
    .from("projects")
    .insert(insert)
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation (duplicate name/slug)
    if (error.code === "23505") {
      throw new Error("Проект с таким именем уже существует. Выберите другое имя.");
    }
    throw error;
  }
  return data as Project;
}

export async function updateProject(id: string, update: ProjectUpdate) {
  const { data, error } = await supabase
    .from("projects")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Проект с таким именем уже существует. Выберите другое имя.");
    }
    throw error;
  }
  return data as Project;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve identifier (UUID or slug) to project ID. Returns null if not found. */
export async function resolveProjectIdentifier(identifier: string): Promise<string | null> {
  if (!identifier?.trim()) return null;
  if (UUID_REGEX.test(identifier.trim())) {
    const { data } = await supabase.from("projects").select("id").eq("id", identifier.trim()).single();
    return data?.id ?? null;
  }
  const { data } = await supabase.from("projects").select("id").eq("slug", identifier.trim()).single();
  return data?.id ?? null;
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}
