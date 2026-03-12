import { useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { mapProject } from "@/lib/projectMapper";

export interface FlatTask {
  id: string;
  title: string;
  completed: boolean;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "high" | "medium" | "low" | "urgent";
  dueDate?: string;
  project?: string;
  comments: number;
}

export function useAllTasks(teamId: string | null) {
  const { data: projectsData, isLoading } = useProjects(teamId);

  const tasks = useMemo(() => {
    if (!projectsData) return [];
    const flat: FlatTask[] = [];
    for (const p of projectsData) {
      const uiProject = mapProject(p);
      for (const t of uiProject.tasks) {
        flat.push({
          id: t.id,
          title: t.title,
          completed: t.status === "done",
          status: t.status,
          priority: t.priority as "high" | "medium" | "low" | "urgent",
          dueDate: t.dueDate || undefined,
          project: uiProject.name,
          comments: t.comments ?? 0,
        });
      }
    }
    flat.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return 0;
    });
    return flat;
  }, [projectsData]);

  return { tasks, isLoading };
}
