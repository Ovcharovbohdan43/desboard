import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Deliverable = Tables<"deliverables">;
export type DeliverableInsert = TablesInsert<"deliverables">;
export type DeliverableUpdate = TablesUpdate<"deliverables">;

export async function fetchDeliverables(projectId: string) {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Deliverable[];
}

export async function createDeliverable(insert: DeliverableInsert) {
  const { data, error } = await supabase
    .from("deliverables")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Deliverable;
}

export async function updateDeliverable(id: string, update: DeliverableUpdate) {
  const { data, error } = await supabase
    .from("deliverables")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Deliverable;
}

export async function deleteDeliverable(id: string) {
  const { error } = await supabase.from("deliverables").delete().eq("id", id);
  if (error) throw error;
}

/** Deliverables for all projects of a team (for Workspace). */
export interface DeliverableWithProject extends Deliverable {
  project_name: string;
  client_name: string | null;
}

export async function fetchDeliverablesByTeam(teamId: string): Promise<DeliverableWithProject[]> {
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, clients(name)")
    .eq("team_id", teamId);
  if (projectsError) throw projectsError;
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("deliverables")
    .select("*")
    .in("project_id", projectIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];

  const byProject = new Map(projects!.map((p) => [p.id, { name: p.name, clientName: (p as { clients: { name: string } | null }).clients?.name ?? null }]));
  return rows.map((d) => {
    const meta = byProject.get(d.project_id);
    return {
      ...d,
      project_name: meta?.name ?? "",
      client_name: meta?.clientName ?? null,
    } as DeliverableWithProject;
  });
}
