import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFiles,
  uploadFile,
  getFileDownloadUrl,
  deleteFile as deleteFileApi,
  updateFile,
  getTeamStorageUsage,
} from "@/api/files";
import type { FileUpdate } from "@/api/files";
import { fileFoldersQueryKey } from "./useFileFolders";

export const filesQueryKey = (folderId: string | null, teamId: string) =>
  ["files", folderId ?? "all", teamId] as const;

export const teamStorageUsageQueryKey = (teamId: string) =>
  ["team_storage_usage", teamId] as const;

export function useFiles(folderId: string | null, teamId: string | null) {
  return useQuery({
    queryKey: filesQueryKey(folderId, teamId ?? ""),
    queryFn: () => fetchFiles(folderId, teamId!),
    enabled: !!teamId,
  });
}

export function useTeamStorageUsage(teamId: string | null) {
  return useQuery({
    queryKey: teamStorageUsageQueryKey(teamId ?? ""),
    queryFn: () => getTeamStorageUsage(teamId!),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

export function useUploadFile(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      folderId,
      projectId,
      addedBy,
      tags,
    }: {
      file: File;
      folderId: string;
      projectId?: string | null;
      addedBy?: string | null;
      tags?: string[];
    }) => uploadFile(file, folderId, teamId!, projectId, addedBy, tags),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: filesQueryKey(variables.folderId, teamId ?? "") });
      qc.invalidateQueries({ queryKey: filesQueryKey(null, teamId ?? "") });
      if (teamId) {
        qc.invalidateQueries({ queryKey: fileFoldersQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: teamStorageUsageQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["workspace_overview", teamId] });
      }
    },
  });
}

export function useDeleteFile(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      deleteFileApi(id, storagePath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      if (teamId) {
        qc.invalidateQueries({ queryKey: fileFoldersQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: teamStorageUsageQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["workspace_overview", teamId] });
      }
    },
  });
}

export function useUpdateFile(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: FileUpdate }) =>
      updateFile(id, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export { getFileDownloadUrl };
