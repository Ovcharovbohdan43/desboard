import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MessageSquare, Upload, FileText, CheckCircle2,
  Clock, Eye, PenLine, ThumbsUp, Paperclip, X, Download,
  LayoutDashboard, ListChecks, Activity, Receipt, History,
  ChevronRight, ExternalLink, Calendar, DollarSign, ArrowUp,
  Users, Zap, BarChart3, ArrowUpRight, Check, Circle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useHandoffData, handoffQueryKey } from "@/hooks/useHandoff";
import { useUpdateProject, useResolveProjectIdentifier } from "@/hooks/useProjects";
import { useSendClientMessage } from "@/hooks/useClientMessages";
import { useUpdateDeliverable } from "@/hooks/useDeliverables";
import { useFileFolders, useCreateFolder } from "@/hooks/useFileFolders";
import { useUploadFile } from "@/hooks/useFiles";
import { useTeamContext } from "@/contexts/TeamContext";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { mapHandoffToClientProject } from "@/lib/handoffMapper";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getFileDownloadUrl } from "@/api/files";

/* ─── Types ─── */
interface Message {
  from: string;
  text: string;
  time: string;
  timeFull?: string;
  attachments?: { id: string; name: string; size: string; storage_path?: string; type?: string }[];
}
interface FileItem { name: string; size: string; type?: string; date?: string }

interface Milestone {
  label: string;
  status: "done" | "active" | "upcoming";
  date?: string;
}

interface Deliverable {
  id: string;
  label: string;
  completed: boolean;
  dueDate?: string;
}

interface ActivityItem {
  id: string;
  type: "message" | "file" | "status" | "rating" | "revision" | "payment";
  description: string;
  time: string;
  actor: string;
}

interface VersionItem {
  id: string;
  version: string;
  date: string;
  notes: string;
  filesCount: number;
}

interface InvoiceItem {
  id: string;
  label: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
}

interface HandoffData {
  id: string;
  client: string;
  project: string;
  description: string;
  status: "approved" | "pending" | "changes";
  rating: number | null;
  messages: Message[];
  files: FileItem[];
  milestones: Milestone[];
  revisionRound: number;
  deliverables: Deliverable[];
  activity: ActivityItem[];
  versions: VersionItem[];
  invoices: InvoiceItem[];
  startDate: string;
  dueDate: string;
  budget: number;
  spent: number;
  hoursTracked: number;
  hoursBudgeted: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  approved: { label: "Approved", icon: <ThumbsUp className="w-4 h-4" />, className: "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border-[var(--brand-primary)]/30" },
  pending: { label: "Pending Review", icon: <Eye className="w-4 h-4" />, className: "bg-warning/15 text-warning border-warning/20" },
  changes: { label: "Changes Requested", icon: <PenLine className="w-4 h-4" />, className: "bg-destructive/15 text-destructive border-destructive/20" },
};

const invoiceStatusConfig: Record<string, string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  overdue: "bg-destructive/15 text-destructive",
};

const activityIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  status: <Zap className="w-3.5 h-3.5" />,
  rating: <Star className="w-3.5 h-3.5" />,
  revision: <History className="w-3.5 h-3.5" />,
  payment: <DollarSign className="w-3.5 h-3.5" />,
};

const fileTypeIcons: Record<string, string> = {
  pdf: "text-destructive",
  figma: "text-purple-500",
  image: "text-blue-500",
  zip: "text-warning",
};

type TabId = "overview" | "deliverables" | "messages" | "files" | "activity" | "versions" | "invoices";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "deliverables", label: "Deliverables", icon: <ListChecks className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "files", label: "Files", icon: <Paperclip className="w-4 h-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  { id: "versions", label: "Versions", icon: <History className="w-4 h-4" /> },
  { id: "invoices", label: "Invoices", icon: <Receipt className="w-4 h-4" /> },
];

/* ─── Progress Timeline ─── */
const ProgressTimeline = ({ milestones }: { milestones: Milestone[] }) => (
  <div className="relative">
    <div className="flex items-start justify-between gap-1">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center text-center relative">
            {!isLast && (
              <div className={cn("absolute top-3 left-[calc(50%+10px)] right-[calc(-50%+10px)] h-0.5", m.status === "done" ? "bg-success" : "bg-border")} />
            )}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center relative z-10 border-2 shrink-0",
              m.status === "done" && "bg-success border-success",
              m.status === "active" && "bg-background border-[var(--brand-primary)] animate-pulse",
              m.status === "upcoming" && "bg-muted border-border"
            )}>
              {m.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-success-foreground" />}
              {m.status === "active" && <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />}
            </div>
            <p className={cn("text-[10px] mt-1.5 leading-tight font-medium max-w-[70px]",
              m.status === "done" && "text-foreground",
              m.status === "active" && "text-[var(--brand-primary)]",
              m.status === "upcoming" && "text-muted-foreground"
            )}>{m.label}</p>
            {m.date && <p className="text-[9px] text-muted-foreground mt-0.5">{m.date}</p>}
          </div>
        );
      })}
    </div>
  </div>
);

/* ─── Stat Card ─── */
const StatCard = ({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) => (
  <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="text-muted-foreground">{icon}</div>
    </div>
    <p className="text-xl font-bold tracking-tight">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

/* ─── Main Portal Page ─── */
const ClientPortalPage = () => {
  const { portalId: param } = useParams<{ portalId: string }>();
  const { teamId } = useTeamContext();
  const { data: teamSettings } = useTeamSettings(teamId);
  const { data: projectIdResolved, isLoading: resolving } = useResolveProjectIdentifier(param ?? null);
  const projectId = projectIdResolved ?? null;
  const { data: handoffFromApi, isLoading } = useHandoffData(projectId);
  const qc = useQueryClient();
  const updateProject = useUpdateProject(teamId);
  const sendMessage = useSendClientMessage(projectId);
  const updateDeliverable = useUpdateDeliverable(projectId);
  const { data: folders = [] } = useFileFolders(teamId);
  const createFolderMutation = useCreateFolder(teamId);
  const uploadFileMutation = useUploadFile(teamId);

  const data = useMemo(
    () => (handoffFromApi ? (mapHandoffToClientProject(handoffFromApi) as HandoffData) : null),
    [handoffFromApi]
  );
  const [message, setMessage] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages.length, activeTab]);

  const loading = resolving || (projectId && isLoading && !data);
  const notFound = !param || (param && !resolving && !projectId) || (projectId && !isLoading && !data);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Eye className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Portal not found</h1>
          <p className="text-sm text-muted-foreground max-w-xs">This link may have expired or the project doesn't exist.</p>
        </div>
      </div>
    );
  }

  const currentRating = data.rating || 0;
  const status = statusConfig[data.status];
  const completedDeliverables = data.deliverables.filter(d => d.completed).length;
  const budgetNum = Number(data.budget);
  const budgetPercent = budgetNum > 0 ? Math.round((Number(data.spent) / budgetNum) * 100) : 0;
  const hoursBudgetedNum = Number(data.hoursBudgeted);
  const hoursPercent = hoursBudgetedNum > 0 ? Math.round((Number(data.hoursTracked) / hoursBudgetedNum) * 100) : 0;
  const revisionSub = (data.startDate && data.dueDate && data.startDate !== "—" && data.dueDate !== "—")
    ? `${data.startDate} → ${data.dueDate}`
    : "—";
  const progressPct = data.deliverables.length
    ? Math.round((completedDeliverables / data.deliverables.length) * 100)
    : 0;

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!message.trim() && !attachedFiles.length) || !projectId || !data || !teamId) return;
    sendMessage.mutate(
      {
        project_id: projectId,
        from_role: "client",
        sender_name: data.client,
        text: message.trim(),
        files: attachedFiles,
        teamId,
      },
      {
        onSuccess: () => {
          setMessage("");
          setAttachedFiles([]);
          toast.success("Message sent");
        },
        onError: () => toast.error("Failed to send message"),
      }
    );
  };

  const handleRate = (rating: number) => {
    if (!projectId) return;
    updateProject.mutate(
      { id: projectId, update: { handoff_rating: rating } },
      {
        onSuccess: () => toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`),
        onError: () => toast.error("Failed to update rating"),
      }
    );
  };

  const handleApprove = () => {
    if (!projectId) return;
    updateProject.mutate(
      { id: projectId, update: { handoff_status: "approved" } },
      {
        onSuccess: () => toast.success("Project approved! 🎉"),
        onError: () => toast.error("Failed to approve"),
      }
    );
  };

  const handleRequestChanges = () => {
    if (!projectId) return;
    updateProject.mutate(
      { id: projectId, update: { handoff_status: "changes" } },
      {
        onSuccess: () => toast("Changes requested — the designer will be notified."),
        onError: () => toast.error("Failed to update"),
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !projectId || !teamId) return;
    let folderId = folders.find((f) => !f.parent_id)?.id ?? folders[0]?.id;
    if (!folderId) {
      const folder = await createFolderMutation.mutateAsync({ team_id: teamId, name: "Client Portal", parent_id: null });
      folderId = folder.id;
    }
    const arr = Array.from(fileList);
    try {
      for (const file of arr) {
        await uploadFileMutation.mutateAsync({ file, folderId, projectId });
      }
      qc.invalidateQueries({ queryKey: handoffQueryKey(projectId) });
      toast.success(`${arr.length} file${arr.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Failed to upload");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleDeliverable = (id: string) => {
    const d = data.deliverables.find((x) => x.id === id);
    if (!d) return;
    updateDeliverable.mutate(
      { id, update: { completed: !d.completed } },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: handoffQueryKey(projectId!) }),
        onError: () => toast.error("Failed to update"),
      }
    );
  };

  /* ─── Tab Content ─── */
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Budget" value={`$${Number(data.spent).toLocaleString()}`} sub={budgetNum > 0 ? `of $${budgetNum.toLocaleString()} (${budgetPercent}%)` : "No budget set"} icon={<DollarSign className="w-4 h-4" />} />
              <StatCard label="Hours" value={`${data.hoursTracked}h`} sub={hoursBudgetedNum > 0 ? `of ${hoursBudgetedNum}h budgeted (${hoursPercent}%)` : "—"} icon={<Clock className="w-4 h-4" />} />
              <StatCard label="Deliverables" value={`${completedDeliverables}/${data.deliverables.length}`} sub={completedDeliverables === data.deliverables.length ? "All completed ✓" : `${data.deliverables.length - completedDeliverables} remaining`} icon={<ListChecks className="w-4 h-4" />} />
              <StatCard label="Revisions" value={`R${data.revisionRound}`} sub={revisionSub} icon={<History className="w-4 h-4" />} />
            </div>

            {/* Progress */}
            <div className="p-5 rounded-2xl bg-card border border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Progress</h3>
              {data.milestones.length > 0 ? (
                <ProgressTimeline milestones={data.milestones} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Deliverables</span>
                    <span className="text-sm font-semibold tabular-nums">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2 rounded-full" />
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="p-5 rounded-2xl bg-card border border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate this delivery</h3>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => handleRate(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-125">
                    <Star className={cn("w-7 h-7 transition-colors", (hoverRating || currentRating) >= star ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-border")} />
                  </button>
                ))}
                {currentRating > 0 && <span className="text-sm text-muted-foreground ml-3 font-medium">{currentRating}.0</span>}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-5 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                <button onClick={() => setActiveTab("activity")} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-3">
                {data.activity.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">{activityIcons[a.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-[11px] text-muted-foreground">{a.actor} · {a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "deliverables":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{completedDeliverables} of {data.deliverables.length} completed</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Track deliverable progress</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{data.deliverables.length ? Math.round((completedDeliverables / data.deliverables.length) * 100) : 0}%</p>
              </div>
            </div>
            <Progress value={data.deliverables.length ? (completedDeliverables / data.deliverables.length) * 100 : 0} className="h-2" />
            <div className="space-y-2 pt-2">
              {data.deliverables.map((d) => (
                <button key={d.id} onClick={() => toggleDeliverable(d.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left group">
                  <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    d.completed ? "bg-success border-success" : "border-border group-hover:border-[var(--brand-primary)]"
                  )}>
                    {d.completed && <Check className="w-3 h-3 text-success-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", d.completed && "line-through text-muted-foreground")}>{d.label}</p>
                    {d.dueDate && <p className="text-[11px] text-muted-foreground">Due {d.dueDate}</p>}
                  </div>
                  {!d.completed && d.dueDate && (
                    <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Pending</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case "messages":
        return (
          <div className="flex flex-col rounded-2xl bg-card border border-border/30 overflow-hidden min-h-[280px] max-h-[min(56vh,480px)]">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain chat-scrollbar">
              <div className="space-y-2 p-4 pb-2 pr-2 min-h-[120px]">
                {data.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">Start the conversation</p>
                  </div>
                ) : (
                <>
                  {data.messages.map((msg, i) => (
                  <div key={(msg as { id?: string }).id ?? `msg-${i}`} className={cn("flex gap-2", msg.from === data.client ? "flex-row-reverse" : "flex-row")}>
                    <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0 text-xs font-semibold">
                      {msg.from === data.client ? data.client.slice(0, 2).toUpperCase() : (msg.from === "You" ? "Me" : msg.from).slice(0, 2).toUpperCase()}
                    </div>
                    <div className={cn("flex flex-col gap-0.5 max-w-[78%]", msg.from === data.client ? "items-end" : "items-start")}>
                      <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-sm break-words",
                        msg.from === data.client ? "bg-[var(--brand-primary)] text-white rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                      )}>
                        {msg.text && <p>{msg.text}</p>}
                        {(msg.attachments?.length ?? 0) > 0 && (
                          <div className={cn("flex flex-col gap-1.5 mt-1.5", msg.text && "pt-1.5 border-t border-current/10")}>
                            {msg.attachments!.map((att) => (
                              <a
                                key={att.id}
                                href="#"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!att.storage_path) return;
                                  try {
                                    const url = await getFileDownloadUrl(att.storage_path);
                                    window.open(url, "_blank");
                                  } catch {
                                    toast.error("Failed to download");
                                  }
                                }}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-current/10 hover:bg-current/20 transition-colors text-left"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-xs truncate flex-1">{att.name}</span>
                                <span className="text-[10px] opacity-70 shrink-0">{att.size}</span>
                                <Download className="w-3 h-3 shrink-0 opacity-60" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1.5">
                        {msg.from === data.client ? "" : `${msg.from} · `}
                        {msg.timeFull ?? msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                </>
                )}
              </div>
            </div>
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border-t border-border/30 bg-muted/20 shrink-0">
                {attachedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/40 text-xs">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))} className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" aria-label={`Remove ${f.name}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end w-full p-3 pt-2 shrink-0 border-t border-border/30 bg-muted/10">
              <input
                ref={chatFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setAttachedFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message…"
                className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-2xl bg-muted/40 border-border/40 flex-1 min-w-0 py-3 px-4 placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim() && !attachedFiles.length}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        );

      case "files":
        return (
          <div className="space-y-2">
            {data.files.map((file, i) => {
              const f = file as { storage_path?: string };
              return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors group">
                <div className={cn("w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0", fileTypeIcons[file.type || ""] || "")}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{file.size}{file.date ? ` · ${file.date}` : ""}</p>
                </div>
                {f.storage_path && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary"
                    onClick={async () => {
                      try {
                        const url = await getFileDownloadUrl(f.storage_path!);
                        window.open(url, "_blank");
                      } catch { toast.error("Failed to download"); }
                    }}
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            );})}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-colors text-muted-foreground hover:text-[var(--brand-primary)]">
              <Upload className="w-4 h-4" />
              <span className="text-xs font-medium">Upload files</span>
            </button>
          </div>
        );

      case "activity":
        return (
          <div className="space-y-1">
            {data.activity.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">{activityIcons[a.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{a.description}</p>
                  <p className="text-[11px] text-muted-foreground">{a.actor} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "versions":
        return (
          <div className="space-y-3">
            {data.versions.map((v, i) => (
              <div key={v.id} className={cn("p-4 rounded-xl border transition-colors",
                i === 0 ? "bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20" : "bg-secondary/30 border-border/30"
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", i === 0 && "text-[var(--brand-primary)]")}>{v.version}</span>
                    {i === 0 && <span className="text-[10px] font-medium bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] px-2 py-0.5 rounded-full">Latest</span>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{v.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{v.notes}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{v.filesCount} files</span>
                </div>
              </div>
            ))}
          </div>
        );

      case "invoices":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold mt-1">${data.invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Paid</p>
                <p className="text-lg font-bold mt-1 text-success">${data.invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
              </div>
            </div>
            {data.invoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{inv.label}</p>
                  <p className="text-[11px] text-muted-foreground">Due {inv.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">${inv.amount.toLocaleString()}</p>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize", invoiceStatusConfig[inv.status])}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center overflow-hidden">
              {teamSettings?.logo_url ? (
                <img src={teamSettings.logo_url} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Eye className="w-4 h-4 text-[var(--brand-primary)]" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Client Portal</span>
              <p className="text-[11px] text-muted-foreground">{data.client}</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border", status.className)}>
            {status.icon}
            {status.label}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-36">
        {/* Project header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.project}</h1>
          <p className="text-sm text-muted-foreground">{data.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Revision {data.revisionRound}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {data.startDate} — {data.dueDate}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {data.client}</span>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
          <div className="flex gap-2 items-end w-full">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message to the designer…"
              className="min-h-[44px] max-h-[100px] resize-none text-sm rounded-2xl bg-muted/40 border-border/40 flex-1 min-w-0 py-3 px-4 placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim()}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          {data.status !== "approved" && (
            <div className="flex gap-2">
              <Button onClick={handleApprove} className="flex-1 rounded-xl gap-2" variant="default">
                <ThumbsUp className="w-4 h-4" /> Approve
              </Button>
              <Button onClick={handleRequestChanges} className="flex-1 rounded-xl gap-2" variant="outline">
                <PenLine className="w-4 h-4" /> Request Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPortalPage;
