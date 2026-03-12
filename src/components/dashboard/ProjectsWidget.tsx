import { useState, useMemo } from "react";
import { useTeamContext } from "@/contexts/TeamContext";
import { useProjects } from "@/hooks/useProjects";
import { slugify } from "@/api/projects";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useCreateProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { mapProject } from "@/lib/projectMapper";
import {
  Plus, Search, Filter, LayoutGrid, List, Calendar, MoreHorizontal,
  ChevronDown, ChevronRight, Clock, Users, CheckCircle2, Circle,
  AlertCircle, ArrowUpRight, Trash2, Edit3, X, GripVertical,
  Target, Tag, Paperclip, MessageSquare, FolderKanban,
  Upload, FileText, Image, Film, Music, Archive, File, Palette,
  Link2, HardDrive, Eye, Download, Star, ListTodo,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getSizeTier } from "./WidgetCard";
import { CreateTeamDialog } from "@/components/TeamSelector";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

interface Task {
  id: string; title: string; description: string; status: TaskStatus;
  priority: Priority; assignee: string; dueDate: string; tags: string[];
  comments: number; attachments: number;
}

interface Milestone { id: string; title: string; dueDate: string; completed: boolean; }

interface ProjectFile {
  id: string; name: string; type: "pdf" | "design" | "image" | "video" | "audio" | "archive" | "doc";
  size: string; addedBy: string; date: string; source: "upload" | "vault"; vaultFileId?: string;
}

interface Project {
  id: string; name: string; client: string; status: ProjectStatus;
  progress: number; deadline: string; description: string; team: string[];
  tasks: Task[]; milestones: Milestone[]; color: string; budget: number; spent: number;
  files: ProjectFile[];
}

const TEAM = ["Alex M.", "Sarah K.", "James L.", "Nina P.", "Tom R.", "Yuki H."];
const COLORS = [
  "hsl(220 10% 30%)", "hsl(220 10% 45%)", "hsl(220 10% 55%)",
  "hsl(220 10% 65%)", "hsl(220 10% 40%)", "hsl(220 10% 50%)",
];
const TAG_POOL = ["design", "dev", "branding", "ui", "ux", "print", "web", "mobile", "strategy", "research"];

const makeTasks = (seeds: Partial<Task>[]): Task[] =>
  seeds.map((s, i) => ({
    id: `t-${Date.now()}-${i}`, title: s.title || "Untitled", description: s.description || "",
    status: s.status || "todo", priority: s.priority || "medium",
    assignee: s.assignee || TEAM[i % TEAM.length], dueDate: s.dueDate || "Mar 20",
    tags: s.tags || [], comments: s.comments ?? Math.floor(Math.random() * 5),
    attachments: s.attachments ?? Math.floor(Math.random() * 3),
  }));

const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1", name: "Brand Identity — Flux", client: "Flux Labs", status: "active",
    progress: 72, deadline: "Mar 15", description: "Complete brand identity system.",
    team: ["Alex M.", "Sarah K.", "Nina P."], color: COLORS[0], budget: 12000, spent: 8640,
    tasks: makeTasks([
      { title: "Logo concepts v3", status: "done", priority: "high", tags: ["design", "branding"] },
      { title: "Typography system", status: "in_progress", priority: "high", tags: ["design"] },
      { title: "Color palette refinement", status: "in_progress", priority: "medium", tags: ["design", "branding"] },
      { title: "Brand guidelines doc", status: "todo", priority: "medium", tags: ["strategy"] },
      { title: "Social media templates", status: "todo", priority: "low", tags: ["design", "web"] },
      { title: "Stationery design", status: "review", priority: "medium", tags: ["print"] },
    ]),
    milestones: [
      { id: "m1", title: "Logo approval", dueDate: "Feb 28", completed: true },
      { id: "m2", title: "Brand book draft", dueDate: "Mar 10", completed: false },
      { id: "m3", title: "Final delivery", dueDate: "Mar 15", completed: false },
    ],
    files: [
      { id: "pf1", name: "Logo-concepts-v3.fig", type: "design", size: "12 MB", addedBy: "Alex M.", date: "Feb 20", source: "upload" },
      { id: "pf2", name: "brand-guide-final.pdf", type: "pdf", size: "6.1 MB", addedBy: "Sarah K.", date: "Feb 18", source: "vault", vaultFileId: "4" },
    ],
  },
  {
    id: "p2", name: "Website Redesign", client: "Mono Studio", status: "active",
    progress: 15, deadline: "Apr 2", description: "Full website redesign.",
    team: ["James L.", "Tom R."], color: COLORS[1], budget: 18000, spent: 2700,
    tasks: makeTasks([
      { title: "Competitor analysis", status: "done", priority: "medium", tags: ["research"] },
      { title: "Wireframes — homepage", status: "in_progress", priority: "high", tags: ["ux", "web"] },
      { title: "Wireframes — inner pages", status: "todo", priority: "high", tags: ["ux", "web"] },
      { title: "Visual design system", status: "todo", priority: "high", tags: ["ui", "design"] },
    ]),
    milestones: [
      { id: "m4", title: "Research complete", dueDate: "Mar 5", completed: true },
      { id: "m5", title: "Design approval", dueDate: "Mar 20", completed: false },
    ],
    files: [
      { id: "pf3", name: "wireframes-v2.fig", type: "design", size: "8.4 MB", addedBy: "James L.", date: "Feb 22", source: "vault", vaultFileId: "9" },
    ],
  },
  {
    id: "p3", name: "Mobile App UI", client: "Nextwave", status: "active",
    progress: 48, deadline: "Mar 28", description: "Design a mobile application.",
    team: ["Yuki H.", "Alex M.", "Sarah K.", "Tom R."], color: COLORS[2], budget: 22000, spent: 10560,
    tasks: makeTasks([
      { title: "User flow mapping", status: "done", priority: "high", tags: ["ux", "mobile"] },
      { title: "Onboarding screens", status: "done", priority: "high", tags: ["ui", "mobile"] },
      { title: "Dashboard design", status: "in_progress", priority: "high", tags: ["ui", "mobile"] },
      { title: "Settings & profile", status: "in_progress", priority: "medium", tags: ["ui"] },
    ]),
    milestones: [
      { id: "m7", title: "Core screens done", dueDate: "Mar 15", completed: false },
    ],
    files: [],
  },
  {
    id: "p4", name: "Packaging Design", client: "Verdant Co", status: "completed",
    progress: 100, deadline: "Feb 10", description: "Eco-friendly packaging design.",
    team: ["Nina P.", "James L."], color: COLORS[3], budget: 8000, spent: 7800,
    tasks: makeTasks([
      { title: "Concept sketches", status: "done", priority: "high", tags: ["design", "print"] },
      { title: "Print-ready files", status: "done", priority: "high", tags: ["print"] },
    ]),
    milestones: [
      { id: "m9", title: "Concept approval", dueDate: "Jan 20", completed: true },
      { id: "m10", title: "Final delivery", dueDate: "Feb 10", completed: true },
    ],
    files: [
      { id: "pf4", name: "packaging-final.pdf", type: "pdf", size: "3.2 MB", addedBy: "Nina P.", date: "Feb 8", source: "upload" },
    ],
  },
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const STATUS_CONFIG: Record<ProjectStatus, { label: string; style: string; icon: React.ReactNode }> = {
  planning: { label: "Planning", style: "bg-muted text-muted-foreground", icon: <Circle className="w-3 h-3" /> },
  active: { label: "Active", style: "bg-foreground/10 text-foreground", icon: <Clock className="w-3 h-3" /> },
  on_hold: { label: "On Hold", style: "bg-foreground/5 text-muted-foreground", icon: <AlertCircle className="w-3 h-3" /> },
  completed: { label: "Completed", style: "bg-foreground/10 text-foreground/70", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; style: string; description?: string; borderColor: string }> = {
  todo: { label: "To Do", style: "bg-muted text-muted-foreground", description: "Not started", borderColor: "hsl(var(--muted-foreground) / 0.5)" },
  in_progress: { label: "In Progress", style: "bg-foreground/10 text-foreground", description: "Work in progress", borderColor: "hsl(var(--primary))" },
  review: { label: "Review", style: "bg-foreground/5 text-muted-foreground", description: "Done, awaiting review or approval before closing", borderColor: "hsl(38 92% 50%)" },
  done: { label: "Done", style: "bg-foreground/10 text-foreground/70", description: "Completed (and approved if needed)", borderColor: "hsl(142 71% 45%)" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; style: string; cardTint: string; badgeStyle: string }> = {
  low: { label: "Low", style: "text-muted-foreground", cardTint: "bg-emerald-500/5 dark:bg-emerald-500/10 border-l-emerald-500/40", badgeStyle: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", style: "text-foreground/60", cardTint: "bg-amber-500/5 dark:bg-amber-500/10 border-l-amber-500/40", badgeStyle: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  high: { label: "High", style: "text-foreground", cardTint: "bg-red-500/5 dark:bg-red-500/10 border-l-red-500/40", badgeStyle: "bg-red-500/15 text-red-600 dark:text-red-400" },
  urgent: { label: "Urgent", style: "text-foreground", cardTint: "bg-red-500/8 dark:bg-red-500/15 border-l-red-500/50", badgeStyle: "bg-red-500/20 text-red-600 dark:text-red-400" },
};

const AddProjectForm = ({
  teamId,
  onSuccess,
  onSubmit,
  isPending,
  error,
  onResetError,
  onOpenCreateTeam,
}: {
  teamId: string | null;
  onSuccess: () => void;
  onSubmit: (data: { team_id: string; name: string; status?: string; client_id?: string | null }, opts?: { onSuccess?: () => void }) => void;
  isPending?: boolean;
  error?: Error | null;
  onResetError?: () => void;
  onOpenCreateTeam?: () => void;
}) => {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const { data: clients = [] } = useClients(teamId);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResetError?.();
    if (!name.trim()) return;
    if (!teamId) return;
    onSubmit(
      { team_id: teamId, name: name.trim(), status: "planning", client_id: clientId && clientId !== "none" ? clientId : null, slug: slugify(name.trim()) },
      { onSuccess: () => { setName(""); setClientId("none"); onSuccess(); } }
    );
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!teamId && (
        <div className="space-y-2">
          <p className="text-sm text-amber-600 dark:text-amber-500">No team selected. Select a team in the sidebar or create one.</p>
          {onOpenCreateTeam && (
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onOpenCreateTeam}>
              Create team
            </Button>
          )}
        </div>
      )}
      <Input
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-xl"
        disabled={!teamId || isPending}
      />
      {teamId && clients.length > 0 && (
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Client (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to create project"}</p>
      )}
      <DialogFooter>
        <Button type="submit" className="rounded-xl" disabled={!name.trim() || !teamId || isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const ProjectsPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);
  const { teamId } = useTeamContext();
  const { data: projectsData, isLoading } = useProjects(teamId);
  const previewProjects = useMemo(() => {
    if (!projectsData) return [];
    return projectsData.map(mapProject).slice(0, 4);
  }, [projectsData]);
  const active = previewProjects.filter(p => p.status === "active").length;
  const totalTasks = previewProjects.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = previewProjects.reduce((s, p) => s + p.tasks.filter(t => t.status === "done").length, 0);

  if (isLoading) return <div className="animate-pulse h-full bg-muted/30 rounded-lg" />;
  if (tier === "compact") {
    return (
      <div className="flex flex-col h-full justify-center gap-1">
        <p className="text-lg font-bold tracking-tight text-primary">{previewProjects.length}</p>
        <p className="text-[10px] text-muted-foreground">projects</p>
        <div className="flex-1 min-h-2 mt-1">
          <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-2 mt-1">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{active}</p>
            <p className="text-[10px] text-muted-foreground">active</p>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {previewProjects.filter(p => p.status === "active").slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0 opacity-50" style={{ background: "var(--brand-primary)" }} />
              <span className="text-[10px] font-medium truncate flex-1">{p.name}</span>
              <span className="text-[9px] text-muted-foreground">{p.progress}%</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <div className="flex-1 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%`, background: "var(--brand-primary)" }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{doneTasks}/{totalTasks}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{doneTasks} done</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {previewProjects.map((p) => {
          const cfg = STATUS_CONFIG[p.status];
          return (
            <div key={p.id} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-foreground/25 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{p.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${cfg.style}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 min-w-0 h-1 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, p.progress))}%`, minWidth: p.progress > 0 ? "4px" : 0 }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{p.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>{previewProjects.length} projects</span>
        <span>{totalTasks} tasks</span>
      </div>
    </div>
  );
};

const TaskCard = ({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) => {
  const statusCfg = TASK_STATUS_CONFIG[(task.status as TaskStatus) || "todo"] ?? TASK_STATUS_CONFIG.todo;
  const isDone = task.status === "done";

  const toggleDone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStatusChange(task.id, isDone ? "todo" : "done");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl p-3.5 hover:border-border/70 hover:shadow-sm transition-all cursor-default border-l-4",
        isDone && "opacity-85 bg-muted/30"
      )}
      style={{ borderLeftColor: statusCfg.borderColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={toggleDone}
              className={cn(
                "shrink-0 rounded-md p-0.5 transition-colors hover:bg-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isDone ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              title={isDone ? "Mark as not done" : "Mark as done"}
              aria-label={isDone ? "Mark as not done" : "Mark as done"}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 fill-current" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <p className={cn(
              "text-sm font-medium truncate",
              isDone && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
          </div>
          {task.description && (
            <p className={cn(
              "text-xs text-muted-foreground line-clamp-2 mb-2",
              isDone && "opacity-70"
            )}>
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(task.tags ?? []).map(tag => (
              <span key={tag} className={cn(
                "text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-md",
                isDone && "opacity-70"
              )}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={task.status || "todo"}
            onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
          >
            <SelectTrigger
              className={cn(
                "h-7 w-auto min-w-[100px] text-[10px] rounded-lg border-border/50",
                TASK_STATUS_CONFIG[(task.status as TaskStatus) || "todo"]?.style
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="text-xs" title={TASK_STATUS_CONFIG[s].description}>
                  {TASK_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", (PRIORITY_CONFIG[(task.priority as Priority) || "medium"] ?? PRIORITY_CONFIG.medium).badgeStyle)} title="Priority">
            {(PRIORITY_CONFIG[(task.priority as Priority) || "medium"] ?? PRIORITY_CONFIG.medium).label}
          </span>
          <span className={cn("text-[10px] text-muted-foreground", isDone && "opacity-70")}>{task.dueDate}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.comments > 0 && (
            <span className={cn("flex items-center gap-0.5 text-[10px]", isDone && "opacity-70")}>
              <MessageSquare className="w-3 h-3" />{task.comments}
            </span>
          )}
          {task.attachments > 0 && (
            <span className={cn("flex items-center gap-0.5 text-[10px]", isDone && "opacity-70")}>
              <Paperclip className="w-3 h-3" />{task.attachments}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const KanbanColumn = ({
  status,
  tasks,
  onStatusChange,
  onDeleteTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
}) => {
  const cfg = TASK_STATUS_CONFIG[status];
  return (
    <div className="flex-1 min-w-[260px] max-w-[340px]">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${cfg.style}`}
          title={cfg.description}
        >
          {cfg.label}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2.5 min-h-[100px]">
        <AnimatePresence>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onDelete={onDeleteTask} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const VAULT_FILES: { id: string; name: string; type: ProjectFile["type"]; size: string; folder: string }[] = [
  { id: "v1", name: "Onboarding-Guide.pdf", type: "pdf", size: "4.2 MB", folder: "Onboarding" },
  { id: "v2", name: "Product-Roadmap.docx", type: "doc", size: "1.8 MB", folder: "Onboarding" },
  { id: "v3", name: "hero-mockup-v3.fig", type: "design", size: "18 MB", folder: "Mockups" },
  { id: "v4", name: "brand-guide-final.pdf", type: "pdf", size: "6.1 MB", folder: "Branding" },
  { id: "v5", name: "NDA-AcmeCorp.pdf", type: "pdf", size: "520 KB", folder: "Contracts" },
  { id: "v6", name: "social-media-pack.zip", type: "archive", size: "42 MB", folder: "Branding" },
  { id: "v7", name: "product-demo.mp4", type: "video", size: "120 MB", folder: "General" },
  { id: "v8", name: "wireframes-v2.fig", type: "design", size: "8.4 MB", folder: "Mockups" },
  { id: "v9", name: "hero-banner.png", type: "image", size: "2.8 MB", folder: "Branding" },
  { id: "v10", name: "invoice-template.docx", type: "doc", size: "890 KB", folder: "Templates" },
  { id: "v11", name: "proposal-zenith.pdf", type: "pdf", size: "3.4 MB", folder: "Proposals" },
  { id: "v12", name: "contract-template.docx", type: "doc", size: "1.2 MB", folder: "Templates" },
];

const FILE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText, design: Palette, image: Image, video: Film, audio: Music, archive: Archive, doc: File,
};
const FILE_COLOR_MAP: Record<string, string> = {
  pdf: "text-red-400", design: "text-purple-400", image: "text-blue-400",
  video: "text-pink-400", audio: "text-amber-400", archive: "text-emerald-400", doc: "text-sky-400",
};

const ProjectFilesTab = ({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
}) => {
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [selectedVaultFiles, setSelectedVaultFiles] = useState<Set<string>>(new Set());

  const linkedVaultIds = new Set(project.files.filter(f => f.vaultFileId).map(f => f.vaultFileId));
  const availableVaultFiles = VAULT_FILES.filter(f => !linkedVaultIds.has(f.id));
  const filteredVault = availableVaultFiles.filter(f =>
    !vaultSearch || f.name.toLowerCase().includes(vaultSearch.toLowerCase()) || f.folder.toLowerCase().includes(vaultSearch.toLowerCase())
  );

  const linkFromVault = () => {
    const newFiles: ProjectFile[] = [];
    selectedVaultFiles.forEach(vId => {
      const vf = VAULT_FILES.find(f => f.id === vId);
      if (vf) {
        newFiles.push({
          id: uid(), name: vf.name, type: vf.type, size: vf.size,
          addedBy: TEAM[0], date: "Mar 2", source: "vault", vaultFileId: vf.id,
        });
      }
    });
    onUpdate({ ...project, files: [...project.files, ...newFiles] });
    setSelectedVaultFiles(new Set());
    setShowVaultPicker(false);
  };

  const uploadFile = () => {
    const mockFile: ProjectFile = {
      id: uid(), name: `upload-${Date.now().toString(36)}.pdf`, type: "pdf",
      size: `${(Math.random() * 10 + 1).toFixed(1)} MB`, addedBy: TEAM[0], date: "Mar 2", source: "upload",
    };
    onUpdate({ ...project, files: [...project.files, mockFile] });
  };

  const removeFile = (fileId: string) => {
    onUpdate({ ...project, files: project.files.filter(f => f.id !== fileId) });
  };

  const toggleVaultSelect = (id: string) => {
    setSelectedVaultFiles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => setShowVaultPicker(true)}>
          <Link2 className="w-3.5 h-3.5" /> Link from Vault
        </Button>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={uploadFile}>
          <Upload className="w-3.5 h-3.5" /> Upload File
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{project.files.length} file{project.files.length !== 1 ? "s" : ""}</span>
      </div>

      {project.files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No files attached</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Upload files or link from the vault</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {project.files.map(file => {
              const Icon = FILE_ICON_MAP[file.type] || File;
              const color = FILE_COLOR_MAP[file.type] || "text-muted-foreground";
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group flex items-center gap-3 bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 hover:border-border/70 transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{file.size}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{file.addedBy}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{file.date}</span>
                    </div>
                  </div>
                  {file.source === "vault" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md gap-1 shrink-0">
                      <Link2 className="w-2.5 h-2.5" /> Vault
                    </Badge>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Vault Picker Dialog */}
      <Dialog open={showVaultPicker} onOpenChange={setShowVaultPicker}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Link from File Vault</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={vaultSearch} onChange={e => setVaultSearch(e.target.value)} placeholder="Search vault files…" className="pl-9 rounded-xl" />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1.5">
              {filteredVault.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No available files to link</p>
              ) : (
                filteredVault.map(vf => {
                  const Icon = FILE_ICON_MAP[vf.type] || File;
                  const color = FILE_COLOR_MAP[vf.type] || "text-muted-foreground";
                  const selected = selectedVaultFiles.has(vf.id);
                  return (
                    <button
                      key={vf.id}
                      onClick={() => toggleVaultSelect(vf.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        selected ? "bg-foreground/10 border border-foreground/20" : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vf.name}</p>
                        <p className="text-[10px] text-muted-foreground">{vf.folder} · {vf.size}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? "border-foreground bg-foreground" : "border-muted-foreground/30"
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowVaultPicker(false)}>Cancel</Button>
            <Button className="rounded-xl gap-1" onClick={linkFromVault} disabled={selectedVaultFiles.size === 0}>
              <Link2 className="w-3.5 h-3.5" /> Link {selectedVaultFiles.size > 0 ? `${selectedVaultFiles.size} file${selectedVaultFiles.size > 1 ? "s" : ""}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProjectDetail = ({
  project,
  onBack,
  createTaskMutation,
  onUpdateTask,
  onDeleteTask,
}: {
  project: Project;
  onBack: () => void;
  createTaskMutation: ReturnType<typeof useCreateTask>;
  onUpdateTask: (id: string, update: { status?: TaskStatus }) => void;
  onDeleteTask: (id: string) => void;
}) => {
  const tasks = project.tasks ?? [];
  const [activeTab, setActiveTab] = useState<"tasks" | "files">("tasks");
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as Priority });

  const addTask = () => {
    if (!newTask.title.trim()) return;
    createTaskMutation.mutate(
      {
        project_id: project.id,
        title: newTask.title.trim(),
        description: newTask.description || "",
        priority: newTask.priority,
      },
      {
        onSuccess: () => {
          setNewTask({ title: "", description: "", priority: "medium" });
          setShowAddTask(false);
          createTaskMutation.reset();
        },
      }
    );
  };

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const changeStatus = (id: string, status: TaskStatus) => {
    onUpdateTask(id, { status });
  };

  const deleteTask = (id: string) => {
    onDeleteTask(id);
  };

  const doneCount = tasks.filter(t => t.status === "done").length;
  const cfg = STATUS_CONFIG[project.status];

  return (
    <div className="space-y-6 min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{project.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{project.client} · {project.deadline}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Progress", value: `${project.progress}%` },
          { label: "Tasks", value: `${doneCount}/${tasks.length}` },
          { label: "Files", value: `${project.files.length}` },
          { label: "Budget", value: `$${(project.budget / 1000).toFixed(0)}k` },
        ].map(s => (
          <div key={s.label} className="bg-secondary/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs: Tasks / Files */}
      <div className="flex items-center gap-1 border-b border-border/30 pb-0">
        {(["tasks", "files"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-xl transition-colors relative ${
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab === "tasks" ? <ListTodo className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
              {tab === "tasks" ? "Tasks" : "Files"}
              <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md">
                {tab === "tasks" ? tasks.length : project.files.length}
              </span>
            </span>
            {activeTab === tab && (
              <motion.div layoutId="project-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "tasks" ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-9 rounded-xl" />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] rounded-xl"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button onClick={() => setView("board")} className={`p-2 ${view === "board" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button type="button" size="sm" className="rounded-xl gap-1" onClick={() => setShowAddTask(true)}>
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>

          {view === "board" ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Pipeline: To Do → In Progress → <span title="Work done, awaiting review or approval">Review</span> → Done
              </p>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map(status => (
                <KanbanColumn key={status} status={status} tasks={filteredTasks.filter(t => t.status === status)} onStatusChange={changeStatus} onDeleteTask={deleteTask} />
              ))}
            </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={changeStatus} onDelete={deleteTask} />
                ))}
              </AnimatePresence>
            </div>
          )}

          <Dialog open={showAddTask} onOpenChange={(open) => { setShowAddTask(open); if (!open) createTaskMutation.reset(); }}>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="rounded-xl" disabled={createTaskMutation.isPending} />
                <Textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} className="rounded-xl" disabled={createTaskMutation.isPending} />
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v as Priority }))} disabled={createTaskMutation.isPending}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                {createTaskMutation.error && (
                  <p className="text-sm text-destructive">
                    {typeof createTaskMutation.error === "object" && createTaskMutation.error !== null && "message" in createTaskMutation.error
                      ? String((createTaskMutation.error as { message: string }).message)
                      : "Failed to add task"}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" onClick={addTask} className="rounded-xl" disabled={!newTask.title.trim() || createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Adding…" : "Add Task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <ProjectFilesTab project={project} onUpdate={() => {}} />
      )}
    </div>
  );
};

export const ProjectsExpanded = () => {
  const { teamId, setTeamId } = useTeamContext();
  const { data: projectsData, isLoading } = useProjects(teamId);
  const createTaskMutation = useCreateTask(null);
  const updateTaskMutation = useUpdateTask(null);
  const deleteTaskMutation = useDeleteTask(null);
  const createProjectMutation = useCreateProject(teamId);
  const projects = useMemo(() => (projectsData ?? []).map(mapProject), [projectsData]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddProject, setShowAddProject] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedId);

  if (isLoading) return <div className="animate-pulse h-48 bg-muted/30 rounded-xl" />;
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedId(null)}
        createTaskMutation={createTaskMutation}
        onUpdateTask={(id, update) => updateTaskMutation.mutate({ id, update })}
        onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
      />
    );
  }

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-9 rounded-xl" />
        </div>
        <Button size="sm" className="rounded-xl gap-1" onClick={() => setShowAddProject(true)}>
          <Plus className="w-4 h-4" /> Add Project
        </Button>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] rounded-xl"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-card/60 border border-border/30 p-12 text-center">
            {projects.length === 0 ? (
              <>
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first project to get started</p>
                <Button size="sm" className="mt-4 rounded-xl gap-1.5" onClick={() => setShowAddProject(true)}>
                  <Plus className="w-4 h-4" /> Add Project
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No projects match</p>
                <p className="text-xs text-muted-foreground mt-1">Try changing the search or filter</p>
                <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : filtered.map(p => {
          const cfg = STATUS_CONFIG[p.status];
          const done = p.tasks.filter(t => t.status === "done").length;
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl p-4 hover:border-border/70 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setSelectedId(p.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cfg.style}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.client} · Due {p.deadline}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, p.progress ?? 0))}%`, minWidth: (p.progress ?? 0) > 0 ? "4px" : 0 }}
                  />
                </div>
                <span className="text-xs font-medium shrink-0 w-8 text-right">{(p.progress ?? 0)}%</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{done}/{p.tasks.length} tasks</span>
                <div className="flex -space-x-1.5">
                  {p.team.slice(0, 3).map((m, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-foreground/10 border border-background flex items-center justify-center text-[8px] font-bold">{m.charAt(0)}</div>
                  ))}
                  {p.team.length > 3 && <div className="w-5 h-5 rounded-full bg-foreground/10 border border-background flex items-center justify-center text-[8px]">+{p.team.length - 3}</div>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showAddProject} onOpenChange={(open) => { setShowAddProject(open); if (!open) createProjectMutation.reset(); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Project</DialogTitle></DialogHeader>
          <AddProjectForm
            teamId={teamId}
            onSuccess={() => setShowAddProject(false)}
            onSubmit={(data, opts) => createProjectMutation.mutate(data, opts)}
            isPending={createProjectMutation.isPending}
            error={createProjectMutation.error}
            onResetError={() => createProjectMutation.reset()}
            onOpenCreateTeam={() => setCreateTeamOpen(true)}
          />
        </DialogContent>
      </Dialog>

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        onCreated={(id) => setTeamId(id)}
      />
    </div>
  );
};
