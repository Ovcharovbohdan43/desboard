import { fetchProjects } from "@/api/projects";
import { fetchTeamMembers } from "@/api/teams";
import { fetchClients } from "@/api/clients";
import { fetchDeliverablesByTeam } from "@/api/deliverables";
import { fetchFiles, getTeamStorageUsage } from "@/api/files";
import { mapProject } from "@/lib/projectMapper";
import { formatRelativeTime, formatFileSize } from "@/lib/utils";
import type { ProjectWithDetails } from "@/api/projects";
import type { TeamMemberWithProfile } from "@/api/teams";
import type { Client } from "@/api/clients";
import type { DeliverableWithProject } from "@/api/deliverables";
import type { FileRecord } from "@/api/files";
import type { UIProject } from "@/lib/projectMapper";

const STORAGE_TOTAL_GB = 50;

export interface WorkspaceOverviewOverdueItem {
  id: string;
  task: string;
  project: string;
  dueDate: string;
  daysOverdue: number;
}

export interface WorkspaceOverviewUpcomingDeadline {
  id: string;
  task: string;
  project: string;
  date: string;
  priority: string;
}

export interface WorkspaceOverviewAwaitingFeedback {
  id: string;
  project: string;
  deliverable: string;
  sentAt: string;
  client: string;
}

export interface WorkspaceOverviewRecentFile {
  id: string;
  name: string;
  project: string;
  time: string;
  size: string;
}

export interface WorkspaceOverviewTeamWorkloadItem {
  member: TeamMemberWithProfile;
  taskCount: number;
}

export interface WorkspaceOverviewStorageUsage {
  usedBytes: number;
  totalBytes: number;
  usedGb: string;
  totalGb: number;
  percent: number;
}

export interface WorkspaceOverviewData {
  activeProjects: UIProject[];
  overdueItems: WorkspaceOverviewOverdueItem[];
  upcomingDeadlines: WorkspaceOverviewUpcomingDeadline[];
  awaitingFeedback: WorkspaceOverviewAwaitingFeedback[];
  recentFiles: WorkspaceOverviewRecentFile[];
  teamWorkload: WorkspaceOverviewTeamWorkloadItem[];
  storageUsage: WorkspaceOverviewStorageUsage;
  recentClientActivity: Client[];
  unreadCommentsCount: number;
  pendingApprovalsCount: number;
}

export async function fetchWorkspaceOverview(teamId: string): Promise<WorkspaceOverviewData> {
  const [projectsData, members, clientsList, deliverablesList, filesList, storage] = await Promise.all([
    fetchProjects(teamId),
    fetchTeamMembers(teamId),
    fetchClients(teamId),
    fetchDeliverablesByTeam(teamId),
    fetchFiles(null, teamId),
    getTeamStorageUsage(teamId),
  ]);

  const projects = projectsData as ProjectWithDetails[];
  const uiProjects = projects.map(mapProject);
  const activeProjects = uiProjects.filter((p) => p.status !== "completed");
  const today = new Date().toISOString().slice(0, 10);

  const overdueItems: WorkspaceOverviewOverdueItem[] = [];
  for (const p of projects) {
    for (const t of p.tasks ?? []) {
      if (t.status === "done" || !t.due_date || t.due_date >= today) continue;
      const d = new Date(t.due_date);
      const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
      overdueItems.push({
        id: t.id,
        task: t.title,
        project: p.name,
        dueDate: mapProject(p).deadline || t.due_date,
        daysOverdue: days,
      });
    }
  }

  const limitEnd = new Date();
  limitEnd.setDate(limitEnd.getDate() + 14);
  const end = limitEnd.toISOString().slice(0, 10);
  const upcomingDeadlines: WorkspaceOverviewUpcomingDeadline[] = [];
  for (const p of projects) {
    for (const t of p.tasks ?? []) {
      if (t.status === "done" || !t.due_date || t.due_date < today || t.due_date > end) continue;
      upcomingDeadlines.push({
        id: t.id,
        task: t.title,
        project: p.name,
        date: new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        priority: (t.priority as string) || "medium",
      });
    }
  }
  upcomingDeadlines.splice(10);

  const awaitingFeedback: WorkspaceOverviewAwaitingFeedback[] = (deliverablesList as DeliverableWithProject[])
    .filter((d) => d.status === "in_review" || d.status === "in-review")
    .map((d) => ({
      id: d.id,
      project: d.project_name,
      deliverable: d.label,
      sentAt: "—",
      client: d.client_name ?? "—",
    }));

  const recentFiles: WorkspaceOverviewRecentFile[] = (filesList as FileRecord[]).slice(0, 10).map((f) => ({
    id: f.id,
    name: f.name,
    project: "—",
    time: formatRelativeTime(f.created_at),
    size: formatFileSize(f.size_bytes),
  }));

  const taskCountByAssignee = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.tasks ?? []) {
      if (t.assignee_id) {
        taskCountByAssignee.set(t.assignee_id, (taskCountByAssignee.get(t.assignee_id) ?? 0) + 1);
      }
    }
  }

  const teamWorkload: WorkspaceOverviewTeamWorkloadItem[] = (members as TeamMemberWithProfile[]).map((m) => ({
    member: m,
    taskCount: taskCountByAssignee.get(m.user_id) ?? 0,
  }));

  const totalBytes = STORAGE_TOTAL_GB * 1024 ** 3;
  const usedBytes = storage.used_bytes ?? 0;
  const percent = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;

  const storageUsage: WorkspaceOverviewStorageUsage = {
    usedBytes,
    totalBytes,
    usedGb: (usedBytes / 1024 ** 3).toFixed(1),
    totalGb: STORAGE_TOTAL_GB,
    percent,
  };

  return {
    activeProjects,
    overdueItems,
    upcomingDeadlines,
    awaitingFeedback,
    recentFiles,
    teamWorkload,
    storageUsage,
    recentClientActivity: clientsList.slice(0, 3),
    unreadCommentsCount: 0,
    pendingApprovalsCount: 0,
  };
}
