import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from "@/api/fileFolders";
import type { FileFolderInsert, FileFolderUpdate } from "@/api/fileFolders";

export const fileFoldersQueryKey = (teamId: string) => ["file_folders", teamId] as const;

export function useFileFolders(teamId: string | null) {
  return useQuery({
    queryKey: fileFoldersQueryKey(teamId ?? ""),
    queryFn: () => fetchFolders(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateFolder(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: FileFolderInsert) => createFolder(insert),
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: fileFoldersQueryKey(teamId) });
    },
  });
}

export function useUpdateFolder(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: FileFolderUpdate }) =>
      updateFolder(id, update),
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: fileFoldersQueryKey(teamId) });
    },
  });
}

export function useDeleteFolder(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: fileFoldersQueryKey(teamId) });
    },
  });
}
