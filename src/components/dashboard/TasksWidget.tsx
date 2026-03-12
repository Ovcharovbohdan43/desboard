import { useState } from "react";
import { Plus, Check, Circle, Clock, Trash2, ListTodo, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSizeTier } from "./WidgetCard";
import { useTeamContext } from "@/contexts/TeamContext";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Task {
  id: string; title: string; completed: boolean;
  status: TaskStatus;
  priority: "high" | "medium" | "low" | "urgent"; dueDate?: string; project?: string; comments: number;
}

const priorityConfig: Record<Task["priority"], { label: string; style: string }> = {
  high: { label: "High", style: "bg-red-500/15 text-red-600 dark:text-red-400" },
  medium: { label: "Med", style: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  low: { label: "Low", style: "bg-muted text-muted-foreground" },
  urgent: { label: "Urgent", style: "bg-red-500/20 text-red-600 dark:text-red-400" },
};

const statusConfig: Record<TaskStatus, { color: string; barColor: string; label: string }> = {
  todo: { color: "text-muted-foreground", barColor: "hsl(var(--muted-foreground))", label: "To Do" },
  in_progress: { color: "text-primary", barColor: "hsl(var(--primary))", label: "In Progress" },
  review: { color: "text-amber-600 dark:text-amber-500", barColor: "hsl(38 92% 50%)", label: "Review" },
  done: { color: "text-emerald-600 dark:text-emerald-500", barColor: "hsl(142 71% 45%)", label: "Done" },
};

export const TasksPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);
  const { teamId } = useTeamContext();
  const { tasks, isLoading } = useAllTasks(teamId);
  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  if (tier === "compact") {
    return (
      <div className="flex flex-col h-full justify-center gap-1">
        <p className="text-lg font-bold tracking-tight">{tasks.length}</p>
        <p className="text-[10px] text-muted-foreground">tasks</p>
        <div className="flex-1 min-h-2 mt-1">
          <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0}%`, background: "hsl(142 71% 45%)" }} />
          </div>
        </div>
      </div>
    );
  }
  if (isLoading) return <div className="animate-pulse h-full bg-muted/30 rounded-lg" />;

  if (tier === "standard") {
    const hasPending = pending.length > 0;
    const accentColor = "var(--brand-primary)";
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" style={{ color: accentColor }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{pending.length}</p>
            <p className="text-[10px] text-muted-foreground">pending</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {pending.slice(0, 3).map((task) => {
            const cfg = statusConfig[task.status] ?? statusConfig.todo;
            return (
              <div key={task.id} className="flex items-center gap-1.5">
                <Circle className={cn("w-2.5 h-2.5 shrink-0", cfg.color)} />
                <span className="text-[10px] font-medium truncate">{task.title}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <div className="flex-1 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-colors" style={{ width: `${tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0}%`, background: "var(--brand-primary)" }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{completed.length}/{tasks.length || 1}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{pending.length}</p>
          <p className="text-xs text-muted-foreground">pending</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{completed.length} done</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {pending.map((task) => {
          const cfg = statusConfig[task.status] ?? statusConfig.todo;
          return (
            <div key={task.id} className="flex items-center gap-2">
              <Circle className={cn("w-3 h-3 shrink-0", cfg.color)} />
              <span className="text-[10px] font-medium truncate flex-1">{task.title}</span>
              {task.project && <span className="text-[8px] text-muted-foreground shrink-0">{task.project}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-foreground/8">
        <div className="flex-1 h-1 bg-foreground/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-colors"
            style={{ width: `${tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0}%`, background: "var(--brand-primary)" }}
          />
        </div>
        <span className="text-[9px] text-muted-foreground">{completed.length}/{tasks.length || 1} complete</span>
      </div>
    </div>
  );
};

export const TasksExpanded = () => {
  const { teamId } = useTeamContext();
  const { tasks, isLoading } = useAllTasks(teamId);
  const { data: projectsData } = useProjects(teamId);
  const projects = projectsData ?? [];
  const createTaskMutation = useCreateTask(null);
  const updateTaskMutation = useUpdateTask(null);
  const deleteTaskMutation = useDeleteTask(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const toggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    updateTaskMutation.mutate(
      { id, update: { status: task.completed ? "todo" : "done" } },
      { onSuccess: () => toast.success("Task updated") }
    );
  };

  const deleteTask = (id: string) => {
    deleteTaskMutation.mutate(id, { onSuccess: () => toast.success("Task deleted") });
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const projectId = newProjectId || projects[0]?.id;
    if (!projectId) {
      toast.error("Create a project first");
      return;
    }
    createTaskMutation.mutate(
      {
        project_id: projectId,
        title: newTitle.trim(),
        priority: newPriority,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          toast.success("Task added");
        },
      }
    );
  };

  if (isLoading) return <div className="animate-pulse h-48 bg-muted/30 rounded-xl" />;

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Add a new task…" className="rounded-xl flex-1 min-w-[160px]" />
        {projects.length > 1 && (
          <select value={newProjectId || projects[0]?.id} onChange={(e) => setNewProjectId(e.target.value)} className="rounded-xl border border-input bg-background px-3 text-xs">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Task["priority"])} className="rounded-xl border border-input bg-background px-3 text-xs">
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <Button onClick={addTask} size="sm" className="rounded-xl gap-1"><Plus className="w-4 h-4" />Add</Button>
      </div>
      <div className="flex gap-2">
        {(["all", "pending", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize", filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary")}>
            {f} {f === "all" ? `(${tasks.length})` : f === "pending" ? `(${tasks.filter((t) => !t.completed).length})` : `(${tasks.filter((t) => t.completed).length})`}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card/60 border border-border/30 p-8 text-center">
            <ListTodo className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{tasks.length === 0 ? "No tasks yet" : "No tasks match this filter"}</p>
            <p className="text-xs text-muted-foreground mt-1">{tasks.length === 0 ? "Add a task above to get started" : "Try a different filter"}</p>
          </div>
        ) : filtered.map((task) => {
          const statusCfg = statusConfig[task.status] ?? statusConfig.todo;
          const isUpdating = updateTaskMutation.isPending && updateTaskMutation.variables?.id === task.id;
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors border-l-4",
                task.completed ? "bg-secondary/20 opacity-60" : "bg-secondary/30 hover:bg-secondary/50"
              )}
              style={{ borderLeftColor: task.completed ? "hsl(142 71% 45% / 0.5)" : statusCfg.barColor }}
            >
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                disabled={isUpdating}
                aria-pressed={task.completed}
                aria-label={task.completed ? "Mark as not done" : "Mark as done"}
                className="shrink-0 rounded p-0.5 hover:bg-foreground/10 disabled:opacity-50"
              >
                {task.completed ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> : <Circle className={cn("w-5 h-5", statusCfg.color)} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {task.project && <span className="text-[10px] text-muted-foreground">{task.project}</span>}
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", (priorityConfig[task.priority] ?? priorityConfig.medium).style)}>
                    {(priorityConfig[task.priority] ?? priorityConfig.medium).label}
                  </span>
                  {task.dueDate && <span className={cn("text-[10px]", !task.completed && new Date(task.dueDate) < new Date() ? "text-foreground font-semibold" : "text-muted-foreground")}><Clock className="w-3 h-3 inline mr-0.5" />{task.dueDate}</span>}
                  {task.comments > 0 && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" /> {task.comments}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
