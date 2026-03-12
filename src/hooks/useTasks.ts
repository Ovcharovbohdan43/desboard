import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/api/tasks";
import type { TaskInsert, TaskUpdate } from "@/api/tasks";

export const tasksQueryKey = (projectId: string) => ["tasks", projectId] as const;

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: tasksQueryKey(projectId ?? ""),
    queryFn: () => fetchTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: TaskInsert) => createTask(insert),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: tasksQueryKey(variables.project_id) });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}

export function useUpdateTask(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: TaskUpdate }) =>
      updateTask(id, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}

export function useDeleteTask(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "workspace_overview" });
    },
  });
}
