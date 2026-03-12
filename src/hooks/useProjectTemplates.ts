import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjectTemplates,
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
} from "@/api/projectTemplates";
import type {
  ProjectTemplateInsert,
  ProjectTemplateUpdate,
} from "@/api/projectTemplates";

export const projectTemplatesQueryKey = (teamId: string) =>
  ["project_templates", teamId] as const;

export function useProjectTemplates(teamId: string | null) {
  return useQuery({
    queryKey: projectTemplatesQueryKey(teamId ?? ""),
    queryFn: () => fetchProjectTemplates(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateProjectTemplate(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: Omit<ProjectTemplateInsert, "team_id">) =>
      createProjectTemplate({ ...insert, team_id: teamId! }),
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: projectTemplatesQueryKey(teamId) });
    },
  });
}

export function useUpdateProjectTemplate(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ProjectTemplateUpdate }) =>
      updateProjectTemplate(id, update),
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: projectTemplatesQueryKey(teamId) });
    },
  });
}

export function useDeleteProjectTemplate(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectTemplate,
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: projectTemplatesQueryKey(teamId) });
    },
  });
}
