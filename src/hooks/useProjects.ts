import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  resolveProjectIdentifier,
} from "@/api/projects";
import type { ProjectInsert, ProjectUpdate } from "@/api/projects";

export const projectsQueryKey = (teamId: string) => ["projects", teamId] as const;
export const projectQueryKey = (id: string) => ["project", id] as const;

export function useProjects(teamId: string | null) {
  return useQuery({
    queryKey: projectsQueryKey(teamId ?? ""),
    queryFn: () => fetchProjects(teamId!),
    enabled: !!teamId,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: projectQueryKey(id ?? ""),
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });
}

export const resolveProjectQueryKey = (identifier: string) =>
  ["resolve_project", identifier] as const;

/** Resolve URL param (UUID or slug) to project ID for portal/client pages. */
export function useResolveProjectIdentifier(identifier: string | null) {
  return useQuery({
    queryKey: resolveProjectQueryKey(identifier ?? ""),
    queryFn: () => resolveProjectIdentifier(identifier!),
    enabled: !!identifier?.trim(),
  });
}

export function useCreateProject(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: ProjectInsert) => createProject(insert),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: projectsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["workspace_overview", teamId] });
      }
    },
  });
}

export function useUpdateProject(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ProjectUpdate }) =>
      updateProject(id, update),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: projectQueryKey(id) });
      if (teamId) {
        qc.invalidateQueries({ queryKey: projectsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["workspace_overview", teamId] });
      }
      qc.invalidateQueries({ queryKey: ["handoff", id] });
    },
  });
}

export function useDeleteProject(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: projectsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["workspace_overview", teamId] });
      }
    },
  });
}
