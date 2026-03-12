import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { MappedClientProject } from "@/lib/handoffMapper";

export interface ClientPortalTokenData {
  ok: boolean;
  error?: string;
  project?: {
    id: string;
    name: string;
    description: string;
    status: string;
    progress: number;
    deadline: string | null;
    budget: number;
    spent: number;
    client_id: string | null;
    client: { id: string | null; name: string };
    handoff_status: string;
    handoff_rating: number | null;
    slug: string | null;
    created_at: string;
    updated_at: string;
  };
  deliverables?: { id: string; label: string; completed: boolean; due_date: string | null; status: string; sort_order: number; created_at: string }[];
  messages?: { id: string; from_role: string; sender_name: string | null; text: string; created_at: string }[];
  versions?: { id: string; version: string; notes: string; files_count: number; created_at: string }[];
  invoices?: { id: string; label: string; amount: number; status: string; due_date: string | null; created_at: string }[];
  projectFiles?: { id: string; name: string; type: string; size_bytes: number; storage_path: string; created_at: string }[];
  tasks?: unknown[];
  milestones?: { id: string; title: string; due_date: string | null; completed: boolean }[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Fetch client portal data by token (anon-safe, no auth required) */
export async function fetchClientPortalByToken(
  identifier: string,
  token: string
): Promise<{ ok: boolean; error?: string; data?: MappedClientProject }> {
  const { data, error } = await supabase.rpc("get_client_portal_by_token", {
    p_identifier: identifier,
    p_token: token,
  });

  if (error) return { ok: false, error: error.message };

  const res = data as ClientPortalTokenData | null;
  if (!res?.ok || !res.project) {
    return { ok: false, error: res?.error ?? "Invalid or expired token" };
  }

  const p = res.project;
  const clientName = p.client?.name ?? "Unknown";
  const messages = (res.messages ?? []).map((m: { from_role: string; sender_name: string | null; text: string; created_at: string; attachments?: { id: string; name: string; size_bytes: number; storage_path: string; type: string }[] }) => {
    const attachments = (m.attachments ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      size: formatSize(a.size_bytes),
      storage_path: a.storage_path,
      type: a.type,
    }));
    return {
      from: m.from_role === "team" ? "You" : m.sender_name ?? clientName,
      text: m.text,
      time: format(new Date(m.created_at), "MMM d"),
      timeFull: format(new Date(m.created_at), "MMM d, HH:mm"),
      attachments: attachments.length ? attachments : undefined,
    };
  });

  const files = (res.projectFiles ?? []).map((f) => {
    const ext = (f.name || "").split(".").pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: "pdf", fig: "figma", figma: "figma", png: "image", jpg: "image",
      jpeg: "image", gif: "image", webp: "image", zip: "zip",
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

  const milestones = (res.milestones ?? []).map((m, i, arr) => {
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

  const deliverables = (res.deliverables ?? []).map((d) => ({
    id: d.id,
    label: d.label,
    completed: d.completed,
    dueDate: d.due_date ? format(new Date(d.due_date), "MMM d") : undefined,
  }));

  const versions = (res.versions ?? []).map((v) => ({
    id: v.id,
    version: v.version,
    date: format(new Date(v.created_at), "MMM d"),
    notes: v.notes || "",
    filesCount: v.files_count,
  }));

  const invoices = (res.invoices ?? []).map((i) => ({
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

  const mapped: MappedClientProject = {
    id: p.id,
    slug: p.slug ?? undefined,
    client: clientName,
    project: p.name,
    description: p.description || "",
    status: (p.handoff_status ?? "pending") as "approved" | "pending" | "changes",
    rating: p.handoff_rating ?? null,
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

  return { ok: true, data: mapped };
}

/** Create project access token (team members only) */
export async function createProjectAccessToken(
  projectId: string,
  expiresDays = 30
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const { data, error } = await supabase.rpc("create_project_access_token", {
    p_project_id: projectId,
    p_expires_days: expiresDays,
  });

  if (error) return { ok: false, error: error.message };

  const res = data as { ok: boolean; token?: string; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to create token" };
  return { ok: true, token: res.token };
}

/** Submit client feedback by token (anon-safe) */
export async function submitClientFeedbackByToken(
  projectId: string,
  token: string,
  opts: {
    message?: string;
    handoffStatus?: "approved" | "pending" | "changes";
    handoffRating?: number;
    senderName?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("client_submit_feedback_by_token", {
    p_project_id: projectId,
    p_token: token,
    p_message: opts.message ?? null,
    p_handoff_status: opts.handoffStatus ?? null,
    p_handoff_rating: opts.handoffRating ?? null,
    p_sender_name: opts.senderName ?? "Client",
  });

  if (error) return { ok: false, error: error.message };
  const res = data as { ok: boolean; error?: string } | null;
  return { ok: !!res?.ok, error: res?.error };
}

/** Update deliverable by token (anon-safe) */
export async function updateDeliverableByToken(
  projectId: string,
  token: string,
  deliverableId: string,
  completed: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("client_update_deliverable_by_token", {
    p_project_id: projectId,
    p_token: token,
    p_deliverable_id: deliverableId,
    p_completed: completed,
  });

  if (error) return { ok: false, error: error.message };
  const res = data as { ok: boolean; error?: string } | null;
  return { ok: !!res?.ok, error: res?.error };
}
