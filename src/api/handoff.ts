import { supabase } from "@/integrations/supabase/client";
import { fetchDeliverables } from "./deliverables";
import { fetchClientMessages } from "./client_messages";
import { fetchInvoices } from "./invoices";
import { fetchHandoffVersions } from "./handoff_versions";
import type { ProjectWithDetails } from "./projects";

export interface HandoffData {
  project: ProjectWithDetails;
  deliverables: Awaited<ReturnType<typeof fetchDeliverables>>;
  messages: Awaited<ReturnType<typeof fetchClientMessages>>;
  invoices: Awaited<ReturnType<typeof fetchInvoices>>;
  versions: Awaited<ReturnType<typeof fetchHandoffVersions>>;
  projectFiles: { id: string; name: string; type: string; size_bytes: number; storage_path: string; created_at: string }[];
}

export async function fetchHandoffData(projectId: string) {
  const [projectRes, deliverables, messages, invoices, versions, projectFilesRes, filesRes] = await Promise.all([
    supabase
      .from("projects")
      .select(`*, clients(name), tasks(*), milestones(*)`)
      .eq("id", projectId)
      .single(),
    fetchDeliverables(projectId),
    fetchClientMessages(projectId),
    fetchInvoices(projectId),
    fetchHandoffVersions(projectId),
    supabase.from("project_files").select("id, name, type, size_bytes, storage_path, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("files").select("id, name, type, size_bytes, storage_path, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  if (projectRes.error) throw projectRes.error;

  const projectFilesData = (projectFilesRes.data ?? []) as { id: string; name: string; type: string; size_bytes: number; storage_path: string; created_at: string }[];
  const filesData = (filesRes.data ?? []) as { id: string; name: string; type: string; size_bytes: number; storage_path: string; created_at: string }[];
  const seenIds = new Set<string>();
  const mergedFiles = [
    ...projectFilesData.filter((f) => { if (seenIds.has(f.id)) return false; seenIds.add(f.id); return true; }),
    ...filesData.filter((f) => { if (seenIds.has(f.id)) return false; seenIds.add(f.id); return true; }),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    project: projectRes.data as ProjectWithDetails,
    deliverables,
    messages,
    invoices,
    versions,
    projectFiles: mergedFiles,
  } as HandoffData;
}
