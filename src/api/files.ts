import { supabase } from "@/integrations/supabase/client";

const BUCKET = "project-files";

export type FileRecord = {
  id: string;
  folder_id: string;
  project_id: string | null;
  name: string;
  type: string;
  size_bytes: number;
  storage_path: string;
  added_by: string | null;
  version: number;
  starred: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type FileInsert = Omit<FileRecord, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type FileUpdate = Partial<Omit<FileRecord, "id" | "storage_path" | "created_at">>;

export async function fetchFiles(folderId: string | null, teamId: string) {
  if (folderId) {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as FileRecord[];
  }

  // Root: files from all folders in team (via folder join)
  const { data: folders, error: foldersError } = await supabase
    .from("file_folders")
    .select("id")
    .eq("team_id", teamId);

  if (foldersError) throw foldersError;
  const folderIds = (folders ?? []).map((f) => f.id);
  if (folderIds.length === 0) return [];

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .in("folder_id", folderIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FileRecord[];
}

export async function uploadFile(
  file: File,
  folderId: string,
  teamId: string,
  projectId?: string | null,
  addedBy?: string | null,
  tags?: string[]
) {
  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${crypto.randomUUID()}_${safeName}`;
  const storagePath = `${teamId}/${folderId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const insert: FileInsert = {
    folder_id: folderId,
    project_id: projectId ?? null,
    name: file.name,
    type: ext,
    size_bytes: file.size,
    storage_path: storagePath,
    added_by: addedBy ?? null,
    version: 1,
    starred: false,
    tags: tags ?? [],
  };

  const { data, error } = await supabase
    .from("files")
    .insert({ ...insert, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return data as FileRecord;
}

export async function getFileDownloadUrl(storagePath: string, expirySeconds = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expirySeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFile(id: string, storagePath: string) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw error;
}

export async function updateFile(id: string, update: FileUpdate) {
  const { data, error } = await supabase
    .from("files")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/** Aggregated storage usage for a team (via RPC). */
export interface TeamStorageUsage {
  used_bytes: number;
  file_count: number;
}

export async function getTeamStorageUsage(teamId: string): Promise<TeamStorageUsage> {
  const { data, error } = await supabase.rpc("get_team_storage_usage", {
    p_team_id: teamId,
  });
  if (error) throw error;
  const result = data as { used_bytes?: number; file_count?: number; error?: string } | null;
  if (result?.error) {
    throw new Error(result.error === "forbidden" ? "Access denied" : String(result.error));
  }
  return {
    used_bytes: Number(result?.used_bytes ?? 0),
    file_count: Number(result?.file_count ?? 0),
  };
}
