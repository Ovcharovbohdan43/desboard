import { supabase } from "@/integrations/supabase/client";

export type FileFolder = {
  id: string;
  team_id: string;
  name: string;
  parent_id: string | null;
  color: string;
  created_at: string;
};

export type FileFolderInsert = Omit<FileFolder, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type FileFolderUpdate = Partial<Omit<FileFolder, "id" | "team_id" | "created_at">>;

export async function fetchFolders(teamId: string) {
  const { data, error } = await supabase
    .from("file_folders")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as FileFolder[];
}

export async function createFolder(insert: FileFolderInsert) {
  const { data, error } = await supabase
    .from("file_folders")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as FileFolder;
}

export async function updateFolder(id: string, update: FileFolderUpdate) {
  const { data, error } = await supabase
    .from("file_folders")
    .update({ ...update })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as FileFolder;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.from("file_folders").delete().eq("id", id);
  if (error) throw error;
}
