import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, Briefcase, FolderKanban, ListTodo, FileText, Clock,
  AlertTriangle, MessageSquare, CheckCircle2, Upload, Eye,
  HardDrive, Shield, LayoutTemplate, Settings, ChevronRight,
  CalendarDays, Activity, MoreVertical, Pencil, Trash2, CopyPlus, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMemberDisplayName } from "@/api/teams";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSizeTier } from "./WidgetCard";
import { useTeamContext } from "@/contexts/TeamContext";
import { useWorkspaceOverview } from "@/hooks/useWorkspaceOverview";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useClients } from "@/hooks/useClients";
import { useDeliverablesByTeam } from "@/hooks/useDeliverables";
import { useFiles } from "@/hooks/useFiles";
import { useTeams } from "@/hooks/useTeams";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useProjectTemplates, useCreateProjectTemplate, useUpdateProjectTemplate, useDeleteProjectTemplate } from "@/hooks/useProjectTemplates";
import { useCreateProject } from "@/hooks/useProjects";
import { mapProject } from "@/lib/projectMapper";
import type { UIProject } from "@/lib/projectMapper";
import { formatRelativeTime, formatFileSize } from "@/lib/utils";
import { slugify } from "@/api/projects";
import type { ProjectTemplate } from "@/api/projectTemplates";
import type { ProjectWithDetails } from "@/api/projects";
import type { TeamMemberWithProfile } from "@/api/teams";
import type { FileRecord } from "@/api/files";
import type { DeliverableWithProject } from "@/api/deliverables";

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-chart-2",
  low: "bg-muted-foreground/30",
  urgent: "bg-destructive",
};

const statusBadge: Record<string, string> = {
  active: "bg-chart-1/15 text-chart-1",
  review: "bg-chart-2/15 text-chart-2",
  "in-progress": "bg-chart-1/15 text-chart-1",
  "in-review": "bg-chart-2/15 text-chart-2",
  approved: "bg-success/15 text-success",
  todo: "bg-muted/60 text-muted-foreground",
  done: "bg-success/15 text-success",
  draft: "bg-muted/60 text-muted-foreground",
  pending: "bg-chart-2/15 text-chart-2",
  onboarding: "bg-chart-4/15 text-chart-4",
  busy: "bg-destructive/15 text-destructive",
  planning: "bg-muted/60 text-muted-foreground",
  on_hold: "bg-chart-2/15 text-chart-2",
  completed: "bg-success/15 text-success",
};

const TEMPLATE_CATEGORIES = ["General", "Marketing", "Development", "Design", "Other"] as const;

// ── Preview (dashboard card) ────────────────────────────────

export const WorkspacePreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const { teamId } = useTeamContext();
  const { data: overview } = useWorkspaceOverview(teamId);
  const tier = getSizeTier(pixelSize);

  const activeCount = overview?.activeProjects?.length ?? 0;
  const overdueCount = overview?.overdueItems?.length ?? 0;
  const awaitingCount = overview?.awaitingFeedback?.length ?? 0;
  const membersCount = overview?.teamWorkload?.length ?? 0;
  const commentCount = overview?.unreadCommentsCount ?? 0;
  const approvalCount = overview?.pendingApprovalsCount ?? 0;

  if (tier === "compact") return null;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">active projects</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
              <span className="text-[10px] font-medium text-destructive">{overdueCount} overdue</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] text-muted-foreground">{awaitingCount} awaiting feedback</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] text-muted-foreground">{commentCount} unread</span>
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground mt-auto">{approvalCount} pending approvals</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">active projects</p>
        </div>
        {overdueCount > 0 && (
          <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {overdueCount} overdue
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>{commentCount} comments · {awaitingCount} feedback</span>
        <span>{membersCount} team</span>
      </div>
    </div>
  );
};

// ── Section component for expanded view ─────────────────────

const Section = ({ title, icon: Icon, count, children }: { title: string; icon: React.ElementType; count?: number; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="text-[10px] font-semibold bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-md">{count}</span>
      )}
    </div>
    {children}
  </div>
);

// ── Expanded view (full page) ───────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "clients", label: "Clients", icon: Users },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "deliverables", label: "Deliverables", icon: FileText },
  { id: "files", label: "Files", icon: HardDrive },
  { id: "team", label: "Team", icon: Users },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "settings", label: "Settings", icon: Settings },
];

export const WorkspaceExpanded = () => {
  const [tab, setTab] = useState("overview");
  const { teamId } = useTeamContext();
  const { data: overview, isLoading: overviewLoading } = useWorkspaceOverview(teamId);
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects(teamId);
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: clientsList = [], isLoading: clientsLoading } = useClients(teamId);
  const { data: deliverablesList = [], isLoading: deliverablesLoading } = useDeliverablesByTeam(teamId);
  const { data: filesList = [] } = useFiles(null, teamId);
  const { data: teamsList = [] } = useTeams();
  const { data: automationRulesList = [] } = useAutomationRules(teamId);
  const { data: templatesList = [], isLoading: templatesLoading } = useProjectTemplates(teamId);
  const createTemplateMutation = useCreateProjectTemplate(teamId);
  const updateTemplateMutation = useUpdateProjectTemplate(teamId);
  const deleteTemplateMutation = useDeleteProjectTemplate(teamId);
  const createProjectMutation = useCreateProject(teamId);

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ProjectTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null);
  const [templateToUse, setTemplateToUse] = useState<ProjectTemplate | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", category: "General" });
  const [editForm, setEditForm] = useState({ name: "", category: "General" });
  const [useForm, setUseForm] = useState({ projectName: "", clientId: "none" });
  const [projectToSaveAsTemplate, setProjectToSaveAsTemplate] = useState<UIProject | null>(null);
  const [saveAsTemplateForm, setSaveAsTemplateForm] = useState({ name: "", category: "General" });

  const uiProjects = useMemo(() => (projectsData as ProjectWithDetails[]).map(mapProject), [projectsData]);
  const activeProjects = useMemo(() => uiProjects.filter((p) => p.status !== "completed"), [uiProjects]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const overdueItems = useMemo(() => {
    const out: { id: string; task: string; project: string; dueDate: string; daysOverdue: number }[] = [];
    for (const p of projectsData as ProjectWithDetails[]) {
      for (const t of p.tasks ?? []) {
        if (t.status === "done" || !t.due_date) continue;
        if (t.due_date >= today) continue;
        const d = new Date(t.due_date);
        const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
        out.push({
          id: t.id,
          task: t.title,
          project: p.name,
          dueDate: mapProject(p).deadline || t.due_date,
          daysOverdue: days,
        });
      }
    }
    return out;
  }, [projectsData, today]);
  const upcomingDeadlines = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    const end = limit.toISOString().slice(0, 10);
    const out: { id: string; task: string; project: string; date: string; priority: string }[] = [];
    for (const p of projectsData as ProjectWithDetails[]) {
      for (const t of p.tasks ?? []) {
        if (t.status === "done" || !t.due_date || t.due_date < today || t.due_date > end) continue;
        out.push({
          id: t.id,
          task: t.title,
          project: p.name,
          date: new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          priority: (t.priority as string) || "medium",
        });
      }
    }
    return out.slice(0, 10);
  }, [projectsData, today]);
  const awaitingFeedback = useMemo(
    () =>
      deliverablesList
        .filter((d) => d.status === "in_review" || d.status === "in-review")
        .map((d) => ({
          id: d.id,
          project: d.project_name,
          deliverable: d.label,
          sentAt: "—",
          client: d.client_name ?? "—",
        })),
    [deliverablesList]
  );
  const recentFiles = useMemo(
    () =>
      (filesList as FileRecord[]).slice(0, 10).map((f) => ({
        id: f.id,
        name: f.name,
        project: "—",
        time: formatRelativeTime(f.created_at),
        size: formatFileSize(f.size_bytes),
      })),
    [filesList]
  );
  const taskCountByAssignee = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projectsData as ProjectWithDetails[]) {
      for (const t of p.tasks ?? []) {
        if (t.assignee_id) m.set(t.assignee_id, (m.get(t.assignee_id) ?? 0) + 1);
      }
    }
    return m;
  }, [projectsData]);
  const currentTeamName = teamsList.find((t) => t.id === teamId)?.name ?? "Workspace";
  const storageUsedBytes = useMemo(() => (filesList as FileRecord[]).reduce((s, f) => s + (f.size_bytes ?? 0), 0), [filesList]);
  const storageTotalGb = 50;
  const storageUsedGb = (storageUsedBytes / (1024 ** 3)).toFixed(1);

  const fallbackOverview = useMemo(() => ({
    activeProjects,
    overdueItems,
    upcomingDeadlines,
    awaitingFeedback,
    recentFiles,
    teamWorkload: (members as TeamMemberWithProfile[]).map((m) => ({
      member: m,
      taskCount: taskCountByAssignee.get(m.user_id) ?? 0,
    })),
    storageUsage: {
      usedBytes: storageUsedBytes,
      totalBytes: storageTotalGb * 1024 ** 3,
      usedGb: storageUsedGb,
      totalGb: storageTotalGb,
      percent: Math.min((storageUsedBytes / (storageTotalGb * 1024 ** 3)) * 100, 100),
    },
    recentClientActivity: clientsList.slice(0, 3),
    unreadCommentsCount: 0,
    pendingApprovalsCount: 0,
  }), [activeProjects, overdueItems, upcomingDeadlines, awaitingFeedback, recentFiles, members, taskCountByAssignee, storageUsedBytes, storageUsedGb, storageTotalGb, clientsList]);

  const overviewData = overview ?? fallbackOverview;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab — Command Center */}
      {tab === "overview" && (
        <div className="space-y-6">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team to see the workspace overview.</p>
          ) : overviewLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Projects", value: overviewData.activeProjects.length, icon: FolderKanban, color: "text-chart-1" },
              { label: "Overdue Items", value: overviewData.overdueItems.length, icon: AlertTriangle, color: "text-destructive" },
              { label: "Pending Approvals", value: overviewData.pendingApprovalsCount, icon: CheckCircle2, color: "text-chart-2" },
              { label: "Unread Comments", value: overviewData.unreadCommentsCount, icon: MessageSquare, color: "text-chart-4" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-2xl bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Active projects */}
          <Section title="Active Projects" icon={FolderKanban} count={overviewData.activeProjects.length}>
            <div className="space-y-2">
              {overviewData.activeProjects.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No active projects.</p>
              ) : (
              overviewData.activeProjects.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-secondary/15 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{p.client}</span>
                    </div>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge[p.status])}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={p.progress} className="flex-1 h-1.5" />
                    <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{p.progress}%</span>
                    <span className="text-[10px] text-muted-foreground">Due {p.deadline}</span>
                  </div>
                </div>
              )))}
            </div>
          </Section>

          {/* Two-column layout for alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Awaiting Client Feedback" icon={Clock} count={overviewData.awaitingFeedback.length}>
              <div className="space-y-2">
                {overviewData.awaitingFeedback.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">None.</p>
                ) : (
                overviewData.awaitingFeedback.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-secondary/15 border border-border/20">
                    <p className="text-sm font-medium">{f.deliverable}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{f.project} · {f.client}</span>
                      <span className="text-[10px] text-muted-foreground">{f.sentAt}</span>
                    </div>
                  </div>
                )))}
              </div>
            </Section>

            <Section title="Overdue Deliverables" icon={AlertTriangle} count={overviewData.overdueItems.length}>
              <div className="space-y-2">
                {overviewData.overdueItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">None.</p>
                ) : (
                overviewData.overdueItems.map((o) => (
                  <div key={o.id} className="p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                    <p className="text-sm font-medium">{o.task}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{o.project}</span>
                      <span className="text-[10px] text-destructive font-semibold">{o.daysOverdue}d overdue</span>
                    </div>
                  </div>
                )))}
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Upcoming Deadlines" icon={CalendarDays} count={overviewData.upcomingDeadlines.length}>
              <div className="space-y-2">
                {overviewData.upcomingDeadlines.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">None.</p>
                ) : (
                overviewData.upcomingDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", priorityDot[d.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.task}</p>
                      <p className="text-[10px] text-muted-foreground">{d.project}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{d.date}</span>
                  </div>
                )))}
              </div>
            </Section>

            <Section title="Pending Approvals" icon={CheckCircle2} count={overviewData.pendingApprovalsCount}>
              <p className="text-[10px] text-muted-foreground">No pending approvals.</p>
            </Section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Recent Uploads" icon={Upload} count={overviewData.recentFiles.length}>
              <div className="space-y-2">
                {overviewData.recentFiles.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No recent files.</p>
                ) : (
                overviewData.recentFiles.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                    <FileText className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.project} · {u.size}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{u.time}</span>
                  </div>
                )))}
              </div>
            </Section>

            <Section title="Team Workload" icon={Users} count={overviewData.teamWorkload.length}>
              <div className="space-y-2">
                {overviewData.teamWorkload.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No members.</p>
                ) : (
                overviewData.teamWorkload.map(({ member: m, taskCount: load }) => {
                  const displayName = getMemberDisplayName(m.profiles, m.user_id);
                  const initials = displayName.slice(0, 2).toUpperCase() || "?";
                  return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Progress value={Math.min(load * 10, 100)} className="flex-1 h-1" />
                        <span className="text-[10px] text-muted-foreground w-7 text-right">{load} tasks</span>
                      </div>
                    </div>
                  </div>
                  );
                })
                )}
              </div>
            </Section>

            <Section title="Storage Usage" icon={HardDrive}>
              <div className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-2xl font-bold">{overviewData.storageUsage.usedGb} <span className="text-sm font-normal text-muted-foreground">GB</span></p>
                  <span className="text-[10px] text-muted-foreground">of {overviewData.storageUsage.totalGb} GB</span>
                </div>
                <Progress value={overviewData.storageUsage.percent} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-2">{overviewData.storageUsage.percent.toFixed(0)}% used</p>
              </div>
            </Section>
          </div>

          <Section title="Recent Client Activity" icon={Eye}>
            <div className="space-y-2">
              {overviewData.recentClientActivity.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.contact_name ?? c.email ?? "—"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">—</span>
                </div>
              ))}
              {overviewData.recentClientActivity.length === 0 && <p className="text-[10px] text-muted-foreground">No clients.</p>}
            </div>
          </Section>
            </>
          )}
        </div>
      )}

      {/* Clients tab */}
      {tab === "clients" && (
        <div className="space-y-3">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : clientsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : clientsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            clientsList.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{c.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      {c.status && (
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge[c.status])}>{c.status}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{c.contact_name ?? ""} {c.email ? `· ${c.email}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">—</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Projects tab */}
      {tab === "projects" && (
        <div className="space-y-3">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : projectsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects.</p>
          ) : (
            activeProjects.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{p.client}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-lg"
                      title="Save as template"
                      onClick={() => { setProjectToSaveAsTemplate(p); setSaveAsTemplateForm({ name: p.name, category: "General" }); }}
                    >
                      <LayoutTemplate className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge[p.status])}>{p.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={p.progress} className="flex-1 h-1.5" />
                  <span className="text-[10px] font-medium w-8 text-right">{p.progress}%</span>
                  <span className="text-[10px] text-muted-foreground">Due {p.deadline}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div className="space-y-2">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : projectsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            uiProjects.flatMap((p) =>
              p.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", priorityDot[t.priority])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{p.name}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center text-[8px] font-bold shrink-0">{t.assignee}</div>
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge[t.status])}>{t.status.replace("-", " ")}</span>
                </div>
              ))
            )
          )}
        </div>
      )}

      {/* Deliverables tab */}
      {tab === "deliverables" && (
        <div className="space-y-3">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : deliverablesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : deliverablesList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliverables yet.</p>
          ) : (
            (deliverablesList as DeliverableWithProject[]).map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground">{d.project_name} · Due {d.due_date ? new Date(d.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</p>
                  </div>
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge[d.status] ?? statusBadge.draft)}>{d.status.replace("_", " ")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Files tab */}
      {tab === "files" && (
        <div className="space-y-6">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : (
            <>
          <div className="p-4 rounded-xl bg-secondary/15 border border-border/20">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-lg font-bold">{storageUsedGb} <span className="text-sm font-normal text-muted-foreground">GB</span></p>
              <span className="text-xs text-muted-foreground">of {storageTotalGb} GB</span>
            </div>
            <Progress value={Math.min((storageUsedBytes / (storageTotalGb * 1024 ** 3)) * 100, 100)} className="h-2" />
          </div>
          <div className="space-y-2">
            {recentFiles.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No files yet.</p>
            ) : (
              recentFiles.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/15 border border-border/20">
                  <FileText className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground">{u.project} · {u.size}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{u.time}</span>
                </div>
              ))
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* Team tab */}
      {tab === "team" && (
        <div className="space-y-3">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : membersLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            (members as TeamMemberWithProfile[]).map((m) => {
              const taskCount = taskCountByAssignee.get(m.user_id) ?? 0;
              const displayName = getMemberDisplayName(m.profiles, m.user_id);
              const initials = displayName.slice(0, 2).toUpperCase() || "?";
              return (
                <div key={m.id} className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{displayName}</span>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium capitalize", statusBadge.active)}>{m.role}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{m.role} · {taskCount} tasks</p>
                    </div>
                    <div className="w-20">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] font-medium">{taskCount}</span>
                        <span className="text-[9px] text-muted-foreground">tasks</span>
                      </div>
                      <Progress value={Math.min(taskCount * 10, 100)} className="h-1" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Templates tab */}
      {tab === "templates" && (
        <div className="space-y-3">
          {!teamId ? (
            <p className="text-sm text-muted-foreground">Select a team.</p>
          ) : templatesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {templatesList.length === 0 ? "No templates yet." : `${templatesList.length} template(s).`}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => { setCreateForm({ name: "", category: "General" }); setShowCreateTemplate(true); }}
                >
                  <Plus className="w-4 h-4" /> Create template
                </Button>
              </div>
              {templatesList.length === 0 ? (
                <div className="p-4 rounded-xl bg-secondary/15 border border-border/20">
                  <p className="text-sm text-muted-foreground mb-3">Create a template to reuse project settings (name, category, status) when starting new projects.</p>
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => { setCreateForm({ name: "", category: "General" }); setShowCreateTemplate(true); }}>
                    Create your first template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templatesList.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-secondary/15 border border-border/20 flex items-center gap-3">
                      <LayoutTemplate className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.category}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setTemplateToUse(t); setUseForm({ projectName: t.name, clientId: "none" }); }}>
                            <CopyPlus className="w-4 h-4 mr-2" /> Use template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setTemplateToEdit(t); setEditForm({ name: t.name, category: t.category }); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setTemplateToDelete(t)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create template dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={(open) => { setShowCreateTemplate(open); if (!open) createTemplateMutation.reset(); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create template</DialogTitle>
            <DialogDescription>Add a reusable project template. You can use it later to create projects with the same settings.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!teamId || !createForm.name.trim()) return;
              createTemplateMutation.mutate(
                { name: createForm.name.trim(), category: createForm.category },
                { onSuccess: () => { setShowCreateTemplate(false); setCreateForm({ name: "", category: "General" }); } }
              );
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Website redesign"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl"
                disabled={createTemplateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={createForm.category} onValueChange={(v) => setCreateForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createTemplateMutation.error && (
              <p className="text-sm text-destructive">{createTemplateMutation.error instanceof Error ? createTemplateMutation.error.message : "Failed to create template."}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateTemplate(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={!createForm.name.trim() || createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog
        open={!!templateToEdit}
        onOpenChange={(open) => { if (!open) { setTemplateToEdit(null); updateTemplateMutation.reset(); } }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit template</DialogTitle>
            <DialogDescription>Change the template name or category.</DialogDescription>
          </DialogHeader>
          {templateToEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editForm.name.trim()) return;
                updateTemplateMutation.mutate(
                  { id: templateToEdit.id, update: { name: editForm.name.trim(), category: editForm.category } },
                  { onSuccess: () => { setTemplateToEdit(null); } }
                );
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Template name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl"
                  disabled={updateTemplateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {updateTemplateMutation.error && (
                <p className="text-sm text-destructive">{updateTemplateMutation.error instanceof Error ? updateTemplateMutation.error.message : "Failed to update."}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTemplateToEdit(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="rounded-xl" disabled={!editForm.name.trim() || updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete template confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => { if (!open) { setTemplateToDelete(null); deleteTemplateMutation.reset(); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template &quot;{templateToDelete?.name}&quot;. You can create a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (templateToDelete) {
                  deleteTemplateMutation.mutate(templateToDelete.id, { onSuccess: () => setTemplateToDelete(null) });
                }
              }}
            >
              {deleteTemplateMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Use template → create project dialog */}
      <Dialog
        open={!!templateToUse}
        onOpenChange={(open) => { if (!open) { setTemplateToUse(null); createProjectMutation.reset(); } }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create project from template</DialogTitle>
            <DialogDescription>Choose a name and optional client. Project will be created with template defaults.</DialogDescription>
          </DialogHeader>
          {templateToUse && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teamId || !useForm.projectName.trim()) return;
                const config = (templateToUse.config || {}) as Record<string, unknown>;
                const insert = {
                  team_id: teamId,
                  name: useForm.projectName.trim(),
                  slug: slugify(useForm.projectName.trim()),
                  status: (config.status as string) ?? "planning",
                  client_id: useForm.clientId && useForm.clientId !== "none" ? useForm.clientId : null,
                  description: (config.description as string) ?? "",
                  color: (config.color as string) ?? "",
                };
                createProjectMutation.mutate(insert, {
                  onSuccess: () => { setTemplateToUse(null); setUseForm({ projectName: "", clientId: "none" }); },
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Project name</label>
                <Input
                  placeholder="New project name"
                  value={useForm.projectName}
                  onChange={(e) => setUseForm((f) => ({ ...f, projectName: e.target.value }))}
                  className="rounded-xl"
                  disabled={createProjectMutation.isPending}
                />
              </div>
              {clientsList.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client (optional)</label>
                  <Select value={useForm.clientId} onValueChange={(v) => setUseForm((f) => ({ ...f, clientId: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clientsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {createProjectMutation.error && (
                <p className="text-sm text-destructive">{createProjectMutation.error instanceof Error ? createProjectMutation.error.message : "Failed to create project."}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTemplateToUse(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="rounded-xl" disabled={!useForm.projectName.trim() || createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? "Creating…" : "Create project"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Save project as template dialog */}
      <Dialog
        open={!!projectToSaveAsTemplate}
        onOpenChange={(open) => { if (!open) { setProjectToSaveAsTemplate(null); createTemplateMutation.reset(); } }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Save project as template</DialogTitle>
            <DialogDescription>Create a reusable template from this project. Status, description, and color will be saved in the template.</DialogDescription>
          </DialogHeader>
          {projectToSaveAsTemplate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teamId || !saveAsTemplateForm.name.trim()) return;
                createTemplateMutation.mutate(
                  {
                    name: saveAsTemplateForm.name.trim(),
                    category: saveAsTemplateForm.category,
                    config: {
                      status: projectToSaveAsTemplate.status,
                      description: projectToSaveAsTemplate.description ?? "",
                      color: projectToSaveAsTemplate.color ?? "",
                    },
                  },
                  {
                    onSuccess: () => {
                      setProjectToSaveAsTemplate(null);
                      setSaveAsTemplateForm({ name: "", category: "General" });
                    },
                  }
                );
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Template name</label>
                <Input
                  placeholder="e.g. Website redesign"
                  value={saveAsTemplateForm.name}
                  onChange={(e) => setSaveAsTemplateForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl"
                  disabled={createTemplateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={saveAsTemplateForm.category} onValueChange={(v) => setSaveAsTemplateForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createTemplateMutation.error && (
                <p className="text-sm text-destructive">{createTemplateMutation.error instanceof Error ? createTemplateMutation.error.message : "Failed to create template."}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProjectToSaveAsTemplate(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="rounded-xl" disabled={!saveAsTemplateForm.name.trim() || createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating…" : "Save as template"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="space-y-3">
          {[
            { label: "Workspace Name", value: currentTeamName, href: "/settings", icon: Briefcase },
            { label: "Brand Settings", value: "Colors, fonts, logos", href: "/settings?tab=team", icon: Eye },
            { label: "Permission Rules", value: "Roles configured", href: "/settings?tab=team", icon: Shield },
            { label: "Automation Rules", value: `${automationRulesList.length} active`, href: "/settings?tab=team", icon: Activity },
          ].map((s) => (
            <Link key={s.label} to={s.href} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/15 border border-border/20 cursor-pointer hover:bg-secondary/25 transition-colors">
              <s.icon className="w-5 h-5 text-muted-foreground/50" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.value}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
