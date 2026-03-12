import type { ProjectWithDetails } from "@/api/projects";
import type { Task } from "@/api/tasks";
import type { Milestone } from "@/api/milestones";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface UIMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface UITask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  dueDate: string;
  tags: string[];
  comments: number;
  attachments: number;
}

export interface UIProjectFile {
  id: string;
  name: string;
  type: string;
  size: string;
  addedBy: string;
  date: string;
  source: "upload" | "vault";
  vaultFileId?: string;
}

export interface UIProject {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  description: string;
  team: string[];
  tasks: UITask[];
  milestones: UIMilestone[];
  color: string;
  budget: number;
  spent: number;
  files: UIProjectFile[];
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(/, \d{4}$/, "") || d;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapTask(t: Task): UITask {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: (t.status as TaskStatus) ?? "todo",
    priority: (t.priority as Priority) ?? "medium",
    assignee: t.assignee_id ? String(t.assignee_id).slice(0, 8) : "—",
    dueDate: formatDate(t.due_date),
    tags: t.tags ?? [],
    comments: t.comments_count ?? 0,
    attachments: t.attachments_count ?? 0,
  };
}

export function mapMilestone(m: Milestone): UIMilestone {
  return {
    id: m.id,
    title: m.title,
    dueDate: formatDate(m.due_date),
    completed: m.completed ?? false,
  };
}

export function mapProject(p: ProjectWithDetails): UIProject {
  const tasks = (p.tasks ?? []).map(mapTask);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (p.progress != null ? Number(p.progress) : 0);
  return {
    id: p.id,
    name: p.name,
    client: p.clients?.name ?? "",
    status: (p.status as ProjectStatus) ?? "planning",
    progress,
    deadline: formatDate(p.deadline),
    description: p.description ?? "",
    team: [],
    tasks,
    milestones: (p.milestones ?? []).map(mapMilestone),
    color: p.color ?? "hsl(220 10% 45%)",
    budget: Number(p.budget) ?? 0,
    spent: Number(p.spent) ?? 0,
    files: [],
  };
}
