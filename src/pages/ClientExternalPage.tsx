import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MessageSquare, FileText, CheckCircle2, Upload,
  Clock, Eye, PenLine, ThumbsUp, Paperclip, X,
  ChevronRight, Download, Calendar, DollarSign, ArrowUp,
  ListChecks, Activity, History, Receipt,
  ExternalLink, ArrowUpRight, Check, Circle, AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useHandoffData, handoffQueryKey } from "@/hooks/useHandoff";
import { useUpdateProject, useResolveProjectIdentifier } from "@/hooks/useProjects";
import { useSendClientMessage } from "@/hooks/useClientMessages";
import { useUpdateDeliverable } from "@/hooks/useDeliverables";
import {
  useClientPortalByToken,
  useSubmitClientFeedbackByToken,
  useUpdateDeliverableByToken,
  clientPortalTokenQueryKey,
} from "@/hooks/useClientPortalToken";
import { useFileFolders, useCreateFolder } from "@/hooks/useFileFolders";
import { useUploadFile } from "@/hooks/useFiles";
import { useTeamContext } from "@/contexts/TeamContext";
import { mapHandoffToClientProject } from "@/lib/handoffMapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getFileDownloadUrl } from "@/api/files";

/* ─── Types ─── */
interface Message { from: string; text: string; time: string }
interface FileItem { name: string; size: string; type?: string; date?: string }
interface Milestone { label: string; status: "done" | "active" | "upcoming"; date?: string }
interface Deliverable { id: string; label: string; completed: boolean; dueDate?: string }
interface ActivityItem { id: string; type: "message" | "file" | "status" | "rating" | "revision" | "payment"; description: string; time: string; actor: string }
interface VersionItem { id: string; version: string; date: string; notes: string; filesCount: number }
interface InvoiceItem { id: string; label: string; amount: number; status: "paid" | "pending" | "overdue"; dueDate: string }

interface ProjectData {
  id: string; client: string; project: string; description: string;
  status: "approved" | "pending" | "changes"; rating: number | null;
  messages: Message[]; files: FileItem[]; milestones: Milestone[];
  revisionRound: number; deliverables: Deliverable[];
  activity: ActivityItem[]; versions: VersionItem[]; invoices: InvoiceItem[];
  startDate: string; dueDate: string; budget: number; spent: number;
  hoursTracked: number; hoursBudgeted: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  approved: { label: "Approved", icon: <ThumbsUp className="w-4 h-4" />, color: "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border-[var(--brand-primary)]/30" },
  pending: { label: "Pending Review", icon: <Eye className="w-4 h-4" />, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  changes: { label: "Changes Requested", icon: <PenLine className="w-4 h-4" />, color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const invoiceStatusColors: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-500",
  pending: "bg-amber-500/10 text-amber-500",
  overdue: "bg-red-500/10 text-red-400",
};

const fileTypeColors: Record<string, string> = {
  pdf: "text-red-400", figma: "text-purple-400", image: "text-blue-400", zip: "text-amber-400",
};

type SectionId = "overview" | "deliverables" | "files" | "messages" | "invoices";

/* ─── Timeline ─── */
const Timeline = ({ milestones }: { milestones: Milestone[] }) => (
  <div className="flex items-start justify-between gap-1">
    {milestones.map((m, i) => {
      const isLast = i === milestones.length - 1;
      return (
        <div key={i} className="flex-1 flex flex-col items-center text-center relative">
          {!isLast && (
            <div className={cn(
              "absolute top-3 left-[calc(50%+10px)] right-[calc(-50%+10px)] h-0.5",
              m.status === "done" ? "bg-emerald-500/40" : "bg-border"
            )} />
          )}
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center relative z-10 border-2 shrink-0",
            m.status === "done" && "bg-emerald-500 border-emerald-500",
            m.status === "active" && "bg-background border-primary animate-pulse",
            m.status === "upcoming" && "bg-muted border-border"
          )}>
            {m.status === "done" && <Check className="w-3.5 h-3.5 text-white" />}
            {m.status === "active" && <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />}
          </div>
          <p className={cn("text-[10px] mt-1.5 leading-tight font-medium max-w-[70px]",
            m.status === "done" && "text-foreground",
            m.status === "active" && "text-primary",
            m.status === "upcoming" && "text-muted-foreground"
          )}>{m.label}</p>
          {m.date && <p className="text-[9px] text-muted-foreground mt-0.5">{m.date}</p>}
        </div>
      );
    })}
  </div>
);

/* ─── Main External Page ─── */
const ClientExternalPage = () => {
  const { projectId: param } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const identifier = param ?? null;

  const { data: projectIdResolved, isLoading: resolving } = useResolveProjectIdentifier(!token ? identifier : null);
  const projectId = projectIdResolved ?? null;

  const { teamId } = useTeamContext();
  const qc = useQueryClient();

  const { data: tokenResult, isLoading: tokenLoading } = useClientPortalByToken(identifier, token);
  const { data: handoffFromApi, isLoading: handoffLoading } = useHandoffData(projectId);

  const updateProject = useUpdateProject(teamId);
  const sendMessage = useSendClientMessage(projectId);
  const updateDeliverable = useUpdateDeliverable(projectId);
  const submitFeedbackToken = useSubmitClientFeedbackByToken(
    tokenResult?.ok && tokenResult.data ? tokenResult.data.id : null,
    token
  );
  const updateDeliverableToken = useUpdateDeliverableByToken(
    tokenResult?.ok && tokenResult.data ? tokenResult.data.id : null,
    token
  );
  const { data: folders = [] } = useFileFolders(teamId);
  const createFolderMutation = useCreateFolder(teamId);
  const uploadFileMutation = useUploadFile(teamId);

  const dataFromToken = tokenResult?.ok ? tokenResult.data : null;
  const dataFromHandoff = useMemo(() => {
    if (!handoffFromApi) return null;
    const mapped = mapHandoffToClientProject(handoffFromApi);
    return {
      id: mapped.id,
      client: mapped.client,
      project: mapped.project,
      description: mapped.description,
      status: mapped.status,
      rating: mapped.rating,
      messages: mapped.messages,
      files: mapped.files,
      milestones: mapped.milestones,
      revisionRound: mapped.revisionRound,
      deliverables: mapped.deliverables,
      activity: mapped.activity,
      versions: mapped.versions,
      invoices: mapped.invoices,
      startDate: mapped.startDate,
      dueDate: mapped.dueDate,
      budget: mapped.budget,
      spent: mapped.spent,
      hoursTracked: mapped.hoursTracked,
      hoursBudgeted: mapped.hoursBudgeted,
    } as ProjectData;
  }, [handoffFromApi]);

  const data = dataFromToken ?? dataFromHandoff;
  const [section, setSection] = useState<SectionId>("overview");
  const [message, setMessage] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (section === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages.length, section]);

  const isTokenFlow = !!token;
  const loading =
    isTokenFlow
      ? (!!identifier && tokenLoading && !data)
      : (resolving || (projectId && handoffLoading && !data));
  const notFound =
    !param ||
    (isTokenFlow && tokenResult && !tokenResult.ok) ||
    (!isTokenFlow && param && !resolving && !projectId) ||
    (!isTokenFlow && projectId && !handoffLoading && !data);

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
          <h1 className="text-xl font-bold">Project not found</h1>
          <p className="text-sm text-muted-foreground max-w-xs">This link may have expired or the project doesn't exist.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[data.status];
  const currentRating = data.rating || 0;
  const completedDel = data.deliverables.filter(d => d.completed).length;
  const budgetNum = Number(data.budget);
  const budgetPct = budgetNum > 0 ? Math.round((Number(data.spent) / budgetNum) * 100) : 0;
  const revisionSub = (data.startDate && data.dueDate && data.startDate !== "—" && data.dueDate !== "—")
    ? `${data.startDate} → ${data.dueDate}`
    : "—";
  const progressPct = data.deliverables.length ? Math.round((completedDel / data.deliverables.length) * 100) : 0;

  const handleSend = () => {
    if (!message.trim() || !data) return;
    if (isTokenFlow && token) {
      submitFeedbackToken.mutate(
        { message: message.trim(), senderName: data.client },
        {
          onSuccess: (res) => {
            if (res.ok) {
              setMessage("");
              toast.success("Message sent");
            } else toast.error(res.error ?? "Failed to send");
          },
          onError: () => toast.error("Failed to send message"),
        }
      );
    } else if (projectId) {
      sendMessage.mutate(
        { project_id: projectId, from_role: "client", sender_name: data.client, text: message.trim() },
        {
          onSuccess: () => {
            setMessage("");
            toast.success("Message sent");
          },
          onError: () => toast.error("Failed to send message"),
        }
      );
    }
  };

  const handleRate = (r: number) => {
    if (!data) return;
    if (isTokenFlow && token) {
      submitFeedbackToken.mutate(
        { handoffRating: r },
        {
          onSuccess: (res) =>
            res.ok ? toast.success(`Rated ${r} star${r > 1 ? "s" : ""}`) : toast.error(res.error ?? "Failed"),
          onError: () => toast.error("Failed to update rating"),
        }
      );
    } else if (projectId) {
      updateProject.mutate(
        { id: projectId, update: { handoff_rating: r } },
        {
          onSuccess: () => toast.success(`Rated ${r} star${r > 1 ? "s" : ""}`),
          onError: () => toast.error("Failed to update rating"),
        }
      );
    }
  };

  const handleApprove = () => {
    if (!data) return;
    if (isTokenFlow && token) {
      submitFeedbackToken.mutate(
        { handoffStatus: "approved" },
        {
          onSuccess: (res) => (res.ok ? toast.success("Project approved! 🎉") : toast.error(res.error ?? "Failed")),
          onError: () => toast.error("Failed to approve"),
        }
      );
    } else if (projectId) {
      updateProject.mutate(
        { id: projectId, update: { handoff_status: "approved" } },
        {
          onSuccess: () => toast.success("Project approved! 🎉"),
          onError: () => toast.error("Failed to approve"),
        }
      );
    }
  };

  const handleRequestChanges = () => {
    if (!data) return;
    if (isTokenFlow && token) {
      submitFeedbackToken.mutate(
        { handoffStatus: "changes" },
        {
          onSuccess: (res) =>
            res.ok ? toast("Changes requested — the team will be notified.") : toast.error(res.error ?? "Failed"),
          onError: () => toast.error("Failed to update"),
        }
      );
    } else if (projectId) {
      updateProject.mutate(
        { id: projectId, update: { handoff_status: "changes" } },
        {
          onSuccess: () => toast("Changes requested — the team will be notified."),
          onError: () => toast.error("Failed to update"),
        }
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !teamId) return;
    if (isTokenFlow) {
      toast.error("File upload is only available when signed in.");
      return;
    }
    const pid = projectId ?? data?.id;
    if (!pid) return;
    let folderId = folders.find((f) => !f.parent_id)?.id ?? folders[0]?.id;
    if (!folderId) {
      const folder = await createFolderMutation.mutateAsync({ team_id: teamId, name: "Client Portal", parent_id: null });
      folderId = folder.id;
    }
    const arr = Array.from(fileList);
    try {
      for (const file of arr) {
        await uploadFileMutation.mutateAsync({ file, folderId, projectId: pid });
      }
      qc.invalidateQueries({ queryKey: handoffQueryKey(pid) });
      toast.success(`${arr.length} file${arr.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Failed to upload");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleDeliverable = (delivId: string) => {
    if (!data) return;
    const d = data.deliverables.find((x) => x.id === delivId);
    if (!d) return;
    const pid = data.id;
    if (isTokenFlow && token) {
      updateDeliverableToken.mutate(
        { deliverableId: delivId, completed: !d.completed },
        {
          onSuccess: (res) =>
            res.ok
              ? qc.invalidateQueries({ queryKey: clientPortalTokenQueryKey(identifier ?? "", token) })
              : toast.error(res.error ?? "Failed"),
          onError: () => toast.error("Failed to update deliverable"),
        }
      );
    } else {
      updateDeliverable.mutate(
        { id: delivId, update: { completed: !d.completed } },
        {
          onSuccess: () => qc.invalidateQueries({ queryKey: handoffQueryKey(pid) }),
          onError: () => toast.error("Failed to update deliverable"),
        }
      );
    }
  };

  const sections: { id: SectionId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deliverables", label: "Deliverables" },
    { id: "files", label: "Files" },
    { id: "messages", label: "Messages" },
    { id: "invoices", label: "Invoices" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--brand-primary)]">{data.client.slice(0, 2)}</span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">{data.project}</h1>
              <p className="text-[11px] text-muted-foreground">{data.client}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status.color}`}>
            {status.icon}
            {status.label}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 rounded-full bg-muted/40 p-1 w-fit">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                section === s.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {section === "overview" && (
              <div className="space-y-5">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Budget Used", value: `$${Number(data.spent).toLocaleString()}`, sub: budgetNum > 0 ? `of $${budgetNum.toLocaleString()} (${budgetPct}%)` : "No budget set" },
                    { label: "Deliverables", value: `${completedDel}/${data.deliverables.length}`, sub: completedDel === data.deliverables.length ? "All done ✓" : `${data.deliverables.length - completedDel} remaining` },
                    { label: "Revision", value: `R${data.revisionRound}`, sub: revisionSub },
                    { label: "Files", value: data.files.length.toString(), sub: `${data.versions.length} versions` },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-2xl bg-card border border-border/30 space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className="text-xl font-bold tracking-tight">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="p-5 rounded-2xl bg-card border border-border/30">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Progress</h3>
                  {data.milestones.length > 0 ? (
                    <Timeline milestones={data.milestones} />
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
                <div className="p-5 rounded-2xl bg-card border border-border/30">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate this project</h3>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => handleRate(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-125">
                        <Star className={cn("w-7 h-7 transition-colors", (hoverRating || currentRating) >= star ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-border")} />
                      </button>
                    ))}
                    {currentRating > 0 && <span className="text-sm text-muted-foreground ml-3 font-medium">{currentRating}.0</span>}
                  </div>
                </div>

                {/* Actions */}
                {data.status !== "approved" && (
                  <div className="flex gap-3">
                    <Button onClick={handleApprove} className="rounded-xl gap-2 flex-1 sm:flex-none">
                      <ThumbsUp className="w-4 h-4" /> Approve Project
                    </Button>
                    <Button variant="outline" onClick={handleRequestChanges} className="rounded-xl gap-2 flex-1 sm:flex-none">
                      <PenLine className="w-4 h-4" /> Request Changes
                    </Button>
                  </div>
                )}
              </div>
            )}

            {section === "deliverables" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{completedDel}/{data.deliverables.length} completed</h3>
                  <Progress value={data.deliverables.length ? (completedDel / data.deliverables.length) * 100 : 0} className="w-24 h-1.5" />
                </div>
                <div className="space-y-2">
                  {data.deliverables.map((d) => (
                    <button key={d.id} onClick={() => toggleDeliverable(d.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/30 hover:bg-card/80 transition-colors text-left group">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                        d.completed ? "bg-emerald-500" : "border-2 border-border group-hover:border-[var(--brand-primary)]/40"
                      )}>
                        {d.completed && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", d.completed && "line-through text-muted-foreground")}>{d.label}</p>
                        {d.dueDate && <p className="text-[10px] text-muted-foreground mt-0.5">Due {d.dueDate}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {section === "files" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{data.files.length} files</h3>
                </div>
                <div className="space-y-2">
                  {data.files.map((f, i) => {
                    const fileWithPath = f as { storage_path?: string };
                    return (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/30 group">
                        <FileText className={cn("w-5 h-5 shrink-0", fileTypeColors[f.type || ""] || "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{f.size}{f.date ? ` · ${f.date}` : ""}</p>
                        </div>
                        {fileWithPath.storage_path && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                            onClick={async () => {
                              try {
                                const url = await getFileDownloadUrl(fileWithPath.storage_path!);
                                window.open(url, "_blank");
                              } catch {
                                toast.error("Failed to download");
                              }
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isTokenFlow && (
                  <>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border/40 hover:border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/5 transition-colors text-muted-foreground hover:text-[var(--brand-primary)]">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-medium">Upload files</span>
                    </button>
                  </>
                )}

                {/* Versions */}
                <div className="pt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Versions</h3>
                  <div className="space-y-2">
                    {data.versions.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{v.version}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{v.notes}</p>
                          <p className="text-[10px] text-muted-foreground">{v.date} · {v.filesCount} files</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === "messages" && (
              <div className="flex flex-col rounded-2xl bg-card border border-border/30 overflow-hidden min-h-[280px] max-h-[min(58vh,520px)]">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain chat-scrollbar">
                  <div className="space-y-2 p-4 pb-2 min-h-[120px]">
                    {data.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Start the conversation</p>
                      </div>
                    ) : (
                    <>
                    {data.messages.map((m, i) => {
                      const isClient = m.from === data.client;
                      const msgWithAtt = m as { id?: string; attachments?: { id: string; name: string; size: string; storage_path?: string }[] };
                      return (
                        <div key={msgWithAtt.id ?? `msg-${i}`} className={cn("flex gap-2", isClient ? "flex-row-reverse" : "flex-row")}>
                          <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0 text-xs font-semibold">
                            {isClient ? data.client.slice(0, 2).toUpperCase() : (m.from === "You" ? "Yo" : m.from).slice(0, 2).toUpperCase()}
                          </div>
                          <div className={cn("flex flex-col gap-0.5 max-w-[78%]", isClient ? "items-end" : "items-start")}>
                            <div className={cn(
                              "px-3.5 py-2.5 rounded-2xl text-sm break-words",
                              isClient ? "bg-[var(--brand-primary)] text-white rounded-br-md" : "bg-muted rounded-bl-md"
                            )}>
                              {m.text && <p>{m.text}</p>}
                              {(msgWithAtt.attachments?.length ?? 0) > 0 && (
                                <div className={cn("flex flex-col gap-1.5 mt-1.5", m.text && "pt-1.5 border-t border-current/10")}>
                                  {msgWithAtt.attachments!.map((att) => (
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
                            <span className={cn("text-[10px] text-muted-foreground px-1.5", isClient ? "text-primary-foreground/70" : "")}>
                              {isClient ? "" : `${m.from} · `}
                              {(m as { timeFull?: string }).timeFull ?? m.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                    </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-end w-full p-3 pt-2 shrink-0 border-t border-border/30 bg-muted/20">
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type a message…"
                    className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-2xl bg-muted/40 border-border/40 flex-1 min-w-0 py-3 px-4 placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}

            {section === "invoices" && (
              <div className="space-y-3">
                {data.invoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/30">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{inv.label}</p>
                      <p className="text-[10px] text-muted-foreground">Due {inv.dueDate}</p>
                    </div>
                    <span className="text-sm font-bold">${inv.amount.toLocaleString()}</span>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-medium capitalize", invoiceStatusColors[inv.status])}>
                      {inv.status}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border/30 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">${data.invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-[11px] text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">Desboard</span> · Client Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientExternalPage;
