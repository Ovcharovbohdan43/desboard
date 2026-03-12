import type { HandoffData } from "@/api/handoff";
import type { ProjectWithDetails } from "@/api/projects";
import { format } from "date-fns";

export interface MappedMessageAttachment {
  id: string;
  name: string;
  size: string;
  storage_path?: string;
  type?: string;
}

export interface MappedMessage {
  id?: string;
  from: string;
  text: string;
  time: string;
  timeFull?: string;
  attachments?: MappedMessageAttachment[];
}

export interface MappedFileItem {
  id: string;
  name: string;
  size: string;
  type?: string;
  date?: string;
  storage_path?: string;
}

export interface MappedMilestone {
  label: string;
  status: "done" | "active" | "upcoming";
  date?: string;
}

export interface MappedDeliverable {
  id: string;
  label: string;
  completed: boolean;
  dueDate?: string;
}

export interface MappedVersionItem {
  id: string;
  version: string;
  date: string;
  notes: string;
  filesCount: number;
}

export interface MappedInvoiceItem {
  id: string;
  label: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
}

export interface MappedClientProject {
  id: string;
  slug?: string | null;
  client: string;
  project: string;
  description: string;
  status: "approved" | "pending" | "changes";
  rating: number | null;
  messages: MappedMessage[];
  files: MappedFileItem[];
  milestones: MappedMilestone[];
  revisionRound: number;
  deliverables: MappedDeliverable[];
  activity: { id: string; type: string; description: string; time: string; actor: string }[];
  versions: MappedVersionItem[];
  invoices: MappedInvoiceItem[];
  startDate: string;
  dueDate: string;
  budget: number;
  spent: number;
  hoursTracked: number;
  hoursBudgeted: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapHandoffToClientProject(h: HandoffData): MappedClientProject {
  const p = h.project;
  const clientName = (p.clients as { name: string } | null)?.name ?? "Unknown";

  const messages: MappedMessage[] = h.messages.map((m) => {
    const attachments = ((m as { attachments?: { id: string; name: string; size_bytes: number; storage_path: string; type: string }[] }).attachments ?? []).map(
      (a) => ({
        id: a.id,
        name: a.name,
        size: formatSize(a.size_bytes),
        storage_path: a.storage_path,
        type: a.type,
      })
    );
    return {
      id: (m as { id?: string }).id,
      from: m.from_role === "team" ? "You" : m.sender_name ?? clientName,
      text: m.text,
      time: format(new Date(m.created_at), "MMM d"),
      timeFull: format(new Date(m.created_at), "MMM d, HH:mm"),
      attachments: attachments.length ? attachments : undefined,
    };
  });

  const files: MappedFileItem[] = h.projectFiles.map((f) => {
    const ext = (f.name || "").split(".").pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: "pdf", fig: "figma", figma: "figma", png: "image", jpg: "image", jpeg: "image",
      gif: "image", webp: "image", zip: "zip", doc: "doc", docx: "doc",
    };
    return {
      id: f.id,
      name: f.name,
      size: formatSize(f.size_bytes),
      type: (f as { type?: string }).type ?? typeMap[ext ?? ""],
      date: format(new Date(f.created_at), "MMM d"),
      storage_path: f.storage_path,
    };
  });

  const milestones: MappedMilestone[] = (p.milestones ?? []).map((m, i, arr) => {
    const completed = m.completed ?? false;
    const nextIncomplete = arr.findIndex((x) => !x.completed);
    let status: "done" | "active" | "upcoming" = "upcoming";
    if (completed) status = "done";
    else if (nextIncomplete === i || nextIncomplete === -1) status = "active";
    return {
      label: m.title,
      status,
      date: m.due_date ? format(new Date(m.due_date), "MMM d") : undefined,
    };
  });

  const deliverables: MappedDeliverable[] = h.deliverables.map((d) => ({
    id: d.id,
    label: d.label,
    completed: d.completed,
    dueDate: d.due_date ? format(new Date(d.due_date), "MMM d") : undefined,
  }));

  const versions: MappedVersionItem[] = h.versions.map((v) => ({
    id: v.id,
    version: v.version,
    date: format(new Date(v.created_at), "MMM d"),
    notes: v.notes || "",
    filesCount: v.files_count,
  }));

  const invoices: MappedInvoiceItem[] = h.invoices.map((i) => ({
    id: i.id,
    label: i.label,
    amount: Number(i.amount),
    status: i.status as "paid" | "pending" | "overdue",
    dueDate: i.due_date ? format(new Date(i.due_date), "MMM d") : "—",
  }));

  const activity = messages.slice(0, 5).map((m, i) => ({
    id: `a${i}`,
    type: "message" as const,
    description: m.from === "You" ? "Sent a message" : "Sent feedback",
    time: m.time,
    actor: m.from,
  }));

  const handoffStatus = (p as { handoff_status?: string }).handoff_status ?? "pending";
  const handoffRating = (p as { handoff_rating?: number | null }).handoff_rating ?? null;

  const slug = (p as { slug?: string | null }).slug;
  return {
    id: p.id,
    slug: slug ?? undefined,
    client: clientName,
    project: p.name,
    description: p.description || "",
    status: handoffStatus as "approved" | "pending" | "changes",
    rating: handoffRating,
    messages,
    files,
    milestones,
    revisionRound: versions.length || 1,
    deliverables,
    activity,
    versions,
    invoices,
    startDate: p.created_at ? format(new Date(p.created_at), "MMM d") : "—",
    dueDate: p.deadline ? format(new Date(p.deadline), "MMM d") : "—",
    budget: Number(p.budget),
    spent: Number(p.spent),
    hoursTracked: Math.round(Number(p.spent) / 100),
    hoursBudgeted: Math.round(Number(p.budget) / 100),
  };
}

export interface ClientProjectSummary {
  id: string;
  slug?: string | null;
  client: string;
  project: string;
  description: string;
  status: "approved" | "pending" | "changes";
  rating: number | null;
  messages: MappedMessage[];
  files: MappedFileItem[];
  milestones: MappedMilestone[];
  revisionRound: number;
  deliverables: MappedDeliverable[];
  activity: { id: string; type: string; description: string; time: string; actor: string }[];
  versions: MappedVersionItem[];
  invoices: MappedInvoiceItem[];
  startDate: string;
  dueDate: string;
  budget: number;
  spent: number;
  hoursTracked: number;
  hoursBudgeted: number;
}

export function mapProjectToClientProjectSummary(
  p: ProjectWithDetails & { handoff_status?: string; handoff_rating?: number | null }
): ClientProjectSummary {
  const clientName = (p.clients as { name: string } | null)?.name ?? "—";
  const status = (p.handoff_status ?? "pending") as "approved" | "pending" | "changes";
  const slug = (p as { slug?: string | null }).slug;
  return {
    id: p.id,
    slug: slug ?? undefined,
    client: clientName,
    project: p.name,
    description: p.description ?? "",
    status,
    rating: p.handoff_rating ?? null,
    messages: [],
    files: [],
    milestones: (p.milestones ?? []).map((m) => ({
      label: m.title,
      status: (m.completed ? "done" : "upcoming") as "done" | "active" | "upcoming",
      date: m.due_date ? format(new Date(m.due_date), "MMM d") : undefined,
    })),
    revisionRound: 1,
    deliverables: [],
    activity: [],
    versions: [],
    invoices: [],
    startDate: p.created_at ? format(new Date(p.created_at), "MMM d") : "—",
    dueDate: p.deadline ? format(new Date(p.deadline), "MMM d") : "—",
    budget: Number(p.budget),
    spent: Number(p.spent),
    hoursTracked: Math.round(Number(p.spent) / 100),
    hoursBudgeted: Math.round(Number(p.budget) / 100),
  };
}
