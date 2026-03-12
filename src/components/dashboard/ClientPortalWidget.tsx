import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MessageSquare, Upload, FileText, CheckCircle2,
  Clock, Eye, PenLine, ThumbsUp, Paperclip, X, ArrowLeft,
  LayoutDashboard, ListChecks, Activity, Receipt, History,
  ChevronRight, Download, Calendar, DollarSign, ArrowUp,
  Users, Zap, Search, Filter, Plus, Trash2, ExternalLink, Copy,
  Edit3, Mail, User,
} from "lucide-react";
import { useTeamContext } from "@/contexts/TeamContext";
import { useProjects } from "@/hooks/useProjects";
import { useHandoffData, handoffQueryKey } from "@/hooks/useHandoff";
import { useUpdateProject } from "@/hooks/useProjects";
import { useUpdateDeliverable } from "@/hooks/useDeliverables";
import { useSendClientMessage } from "@/hooks/useClientMessages";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { useFileFolders, useCreateFolder } from "@/hooks/useFileFolders";
import { useUploadFile } from "@/hooks/useFiles";
import { useCreateProjectAccessToken } from "@/hooks/useClientPortalToken";
import { mapHandoffToClientProject, mapProjectToClientProjectSummary } from "@/lib/handoffMapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSizeTier } from "./WidgetCard";
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
interface Milestone { label: string; status: "done" | "active" | "upcoming"; date?: string }
interface Deliverable { id: string; label: string; completed: boolean; dueDate?: string }
interface ActivityItem { id: string; type: "message" | "file" | "status" | "rating" | "revision" | "payment"; description: string; time: string; actor: string }
interface VersionItem { id: string; version: string; date: string; notes: string; filesCount: number }
interface InvoiceItem { id: string; label: string; amount: number; status: "paid" | "pending" | "overdue"; dueDate: string }

interface ClientProject {
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

export interface Handoff {
  id: string; client: string; project: string;
  status: "approved" | "pending" | "changes"; rating: number | null;
  messages: { from: string; text: string; time: string }[];
  files: { name: string; size: string }[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-foreground/10 text-foreground/70" },
  pending: { label: "Pending", className: "bg-foreground/5 text-muted-foreground" },
  changes: { label: "Changes", className: "bg-foreground/10 text-foreground" },
};

const invoiceStatusConfig: Record<string, string> = {
  paid: "bg-foreground/10 text-foreground/70",
  pending: "bg-foreground/5 text-muted-foreground",
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

type TabId = "overview" | "deliverables" | "messages" | "files" | "activity" | "versions" | "invoices";

/* ─── Client Form Dialog ─── */
interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClientId: string | null;
  clientsList: { id: string; name: string; contact_name?: string | null; email?: string | null }[];
  teamId: string | null;
  createClient: (insert: { team_id: string; name: string; contact_name?: string; email?: string }) => Promise<unknown>;
  updateClient: (args: { id: string; update: { name?: string; contact_name?: string; email?: string } }) => Promise<unknown>;
  onSuccess: () => void;
}

function ClientFormDialog({ open, onOpenChange, editingClientId, clientsList, teamId, createClient, updateClient, onSuccess }: ClientFormDialogProps) {
  const editing = clientsList.find((c) => c.id === editingClientId);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setContactName(editing.contact_name ?? "");
      setEmail(editing.email ?? "");
    } else {
      setName("");
      setContactName("");
      setEmail("");
    }
  }, [editing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamId) return;
    try {
      if (editingClientId) {
        await updateClient({ id: editingClientId, update: { name: name.trim(), contact_name: contactName.trim() || undefined, email: email.trim() || undefined } });
        toast.success("Client updated");
      } else {
        await createClient({ team_id: teamId, name: name.trim(), contact_name: contactName.trim() || undefined, email: email.trim() || undefined });
        toast.success("Client created");
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error(editingClientId ? "Failed to update client" : "Failed to create client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingClientId ? "Edit client" : "Add client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client-name">Company / Name *</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" className="mt-1.5" required />
          </div>
          <div>
            <Label htmlFor="client-contact">Contact name</Label>
            <Input id="client-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Smith" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acme.com" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>{editingClientId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Preview ─── */
export const ClientsPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const { teamId } = useTeamContext();
  const { data: projects = [] } = useProjects(teamId);
  const clientProjects = useMemo(
    () => projects.filter((p) => p.client_id).map(mapProjectToClientProjectSummary),
    [projects]
  );
  const tier = getSizeTier(pixelSize);
  const pending = clientProjects.filter((h) => h.status === "pending").length;
  const approved = clientProjects.filter((h) => h.status === "approved").length;

  if (tier === "compact") {
    return (
      <div className="flex flex-col h-full justify-center gap-1">
        <p className="text-lg font-bold tracking-tight text-primary">{clientProjects.length}</p>
        <p className="text-[10px] text-muted-foreground">clients</p>
        <div className="flex-1 min-h-2 mt-1">
          <p className="text-[9px] text-muted-foreground">{approved} approved · {pending} pending</p>
        </div>
      </div>
    );
  }

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{clientProjects.length}</p>
            <p className="text-[10px] text-muted-foreground">clients</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {clientProjects.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand-primary)", opacity: 0.5 }} />
              <span className="text-[10px] font-medium truncate">{h.client}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-auto">
          <span>{approved} done</span>
          <span>·</span>
          <span>{pending} pending</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{clientProjects.length}</p>
          <p className="text-xs text-muted-foreground">clients</p>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {clientProjects.map((h) => {
          const cfg = statusConfig[h.status as keyof typeof statusConfig];
          return (
            <div key={h.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
              <span className="text-[10px] font-medium truncate flex-1">{h.client} — {h.project}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${cfg?.className ?? ""}`}>{cfg?.label ?? h.status}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>{approved} approved</span>
        <span>{pending} pending</span>
      </div>
    </div>
  );
};

/* ─── Progress Timeline ─── */
const ProgressTimeline = ({ milestones }: { milestones: Milestone[] }) => (
  <div className="flex items-start justify-between gap-1">
    {milestones.map((m, i) => {
      const isLast = i === milestones.length - 1;
      return (
        <div key={i} className="flex-1 flex flex-col items-center text-center relative">
          {!isLast && (
            <div className={cn(
              "absolute top-3 left-[calc(50%+10px)] right-[calc(-50%+10px)] h-0.5",
              m.status === "done" ? "bg-foreground/30" : "bg-border"
            )} />
          )}
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center relative z-10 border-2 shrink-0",
            m.status === "done" && "bg-foreground border-foreground",
            m.status === "active" && "bg-background border-foreground/50 animate-pulse",
            m.status === "upcoming" && "bg-muted border-border"
          )}>
            {m.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-background" />}
            {m.status === "active" && <div className="w-2 h-2 rounded-full bg-foreground" />}
          </div>
          <p className={cn("text-[10px] mt-1.5 leading-tight font-medium max-w-[70px]",
            m.status === "done" && "text-foreground",
            m.status === "active" && "text-foreground/70",
            m.status === "upcoming" && "text-muted-foreground"
          )}>{m.label}</p>
          {m.date && <p className="text-[9px] text-muted-foreground mt-0.5">{m.date}</p>}
        </div>
      );
    })}
  </div>
);

/* ─── Expanded (full page) ─── */
export const ClientsExpanded = () => {
  const { teamId } = useTeamContext();
  const { data: projects = [] } = useProjects(teamId);
  const [listMode, setListMode] = useState<"projects" | "clients">("projects");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "changes">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const { data: handoffData } = useHandoffData(selectedId);
  const { data: clientsList = [] } = useClients(teamId);
  const updateProject = useUpdateProject(teamId);
  const updateDeliverable = useUpdateDeliverable(selectedId);
  const sendMessage = useSendClientMessage(selectedId);
  const createClientMutation = useCreateClient(teamId);
  const updateClientMutation = useUpdateClient(teamId);
  const deleteClientMutation = useDeleteClient(teamId);
  const qc = useQueryClient();
  const { data: folders = [] } = useFileFolders(teamId);
  const createFolderMutation = useCreateFolder(teamId);
  const uploadFileMutation = useUploadFile(teamId);
  const createTokenMutation = useCreateProjectAccessToken();

  const clientProjects = useMemo(
    () =>
      projects
        .filter((p) => p.client_id)
        .map((p) => ({ ...mapProjectToClientProjectSummary(p), id: p.id, projectId: p.id })),
    [projects]
  );
  const clients = useMemo(
    () => clientProjects as (ClientProject & { projectId?: string })[],
    [clientProjects]
  );

  const selected = useMemo(() => {
    if (handoffData && selectedId) {
      const mapped = mapHandoffToClientProject(handoffData);
      return mapped as ClientProject;
    }
    return clients.find((c) => c.id === selectedId || (c as { projectId?: string }).projectId === selectedId) || null;
  }, [handoffData, selectedId, clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (searchQuery && !c.client.toLowerCase().includes(searchQuery.toLowerCase()) && !c.project.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [clients, filterStatus, searchQuery]);

  useEffect(() => {
    if (activeTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selected?.messages.length, activeTab]);

  const handleSend = () => {
    if ((!message.trim() && !attachedFiles.length) || !selectedId || !teamId) return;
    sendMessage.mutate(
      {
        project_id: selectedId,
        from_role: "team",
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
    if (!selectedId) return;
    updateProject.mutate(
      { id: selectedId, update: { handoff_rating: rating } },
      {
        onSuccess: () => toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`),
        onError: () => toast.error("Failed to update rating"),
      }
    );
  };

  const handleApprove = () => {
    if (!selectedId) return;
    updateProject.mutate(
      { id: selectedId, update: { handoff_status: "approved" } },
      {
        onSuccess: () => toast.success("Project approved! 🎉"),
        onError: () => toast.error("Failed to approve"),
      }
    );
  };

  const handleRequestChanges = () => {
    if (!selectedId) return;
    updateProject.mutate(
      { id: selectedId, update: { handoff_status: "changes" } },
      {
        onSuccess: () => toast("Changes requested"),
        onError: () => toast.error("Failed to update status"),
      }
    );
  };

  const handleSendForReview = () => {
    if (!selectedId) return;
    updateProject.mutate(
      { id: selectedId, update: { handoff_status: "pending" } },
      {
        onSuccess: () => toast.success("Sent for client review"),
        onError: () => toast.error("Failed to update status"),
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !selectedId || !teamId) return;
    let folderId = folders.find((f) => !f.parent_id)?.id ?? folders[0]?.id;
    if (!folderId) {
      const folder = await createFolderMutation.mutateAsync({ team_id: teamId, name: "Client Portal", parent_id: null });
      folderId = folder.id;
    }
    const arr = Array.from(fileList);
    try {
      for (const file of arr) {
        await uploadFileMutation.mutateAsync({ file, folderId, projectId: selectedId });
      }
      qc.invalidateQueries({ queryKey: handoffQueryKey(selectedId) });
      toast.success(`${arr.length} file${arr.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Failed to upload");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleDeliverable = (delivId: string) => {
    if (!selectedId || !selected) return;
    const d = selected.deliverables.find((x) => x.id === delivId);
    if (!d) return;
    updateDeliverable.mutate(
      { id: delivId, update: { completed: !d.completed } },
      { onError: () => toast.error("Failed to update deliverable") }
    );
  };

  // ── List view (Projects or Clients) ──
  if (!selected) {
    const pendingCount = clients.filter((c) => c.status === "pending").length;
    const approvedCount = clients.filter((c) => c.status === "approved").length;
    const changesCount = clients.filter((c) => c.status === "changes").length;
    const activeCount = pendingCount + changesCount;

    return (
      <div className="space-y-6">
        {/* Mode toggle: Projects | Clients */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-1">
            <button
              onClick={() => setListMode("projects")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                listMode === "projects" ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              Projects
            </button>
            <button
              onClick={() => setListMode("clients")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                listMode === "clients" ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              Clients
            </button>
          </div>
          {listMode === "clients" && (
            <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { setEditingClientId(null); setClientDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Client
            </Button>
          )}
        </div>

        {/* Clients management view */}
        {listMode === "clients" && (
          <div className="space-y-3">
            {clientsList.length === 0 ? (
              <div className="rounded-2xl bg-card/60 border border-border/30 p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No clients yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add a client to assign to projects</p>
                <Button size="sm" className="mt-4 rounded-xl gap-1.5" onClick={() => setClientDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Client
                </Button>
              </div>
            ) : (
              clientsList.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 hover:bg-card/80 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{client.name}</p>
                      {client.contact_name && <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>}
                      {client.email && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditingClientId(client.id); setClientDialogOpen(true); }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setDeleteClientId(client.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
        </div>
        )}

        {/* Projects view */}
        {listMode === "projects" && (
          <>
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Projects", value: clients.length.toString() },
            { label: "Active", value: activeCount.toString(), sub: "awaiting review" },
            { label: "Approved", value: approvedCount.toString() },
            { label: "Pending", value: pendingCount.toString(), sub: "client review" },
          ].map((kpi: { label: string; value: string; sub?: string }) => (
            <div key={kpi.label} className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-1">{kpi.value}</p>
              {kpi.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-card/60 border-border/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-1">
            {(["all", "pending", "changes", "approved"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize",
                  filterStatus === s ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Client cards */}
        <div className="space-y-3">
          {filteredClients.length === 0 ? (
            <div className="rounded-2xl bg-card/60 border border-border/30 p-12 text-center">
              {clients.length === 0 ? (
                <>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">No client projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Create a project in the Projects widget and assign a client to it. Projects with clients will appear here for handoff.
                  </p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">No projects match</p>
                  <p className="text-xs text-muted-foreground mt-1">Try changing the search or filter</p>
                  <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}>
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          ) : filteredClients.map(c => {
            const cfg = statusConfig[c.status];
            const completedDel = c.deliverables.filter(d => d.completed).length;
            const budgetPct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedId((c as { projectId?: string }).projectId ?? c.id); setActiveTab("overview"); }}
                className="w-full text-left rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm hover:bg-card/80 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{c.client}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.project}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>{completedDel}/{c.deliverables.length} deliverables</span>
                  <span>·</span>
                  <span>{budgetPct}% budget used</span>
                  <span>·</span>
                  <span>R{c.revisionRound}</span>
                  {c.rating && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-foreground/40 text-foreground/40" /> {c.rating}</span>
                    </>
                  )}
                </div>
                <Progress value={((completedDel / (c.deliverables.length || 1)) * 100) || 0} className="h-1 mt-3 rounded-full" />
              </button>
            );
          })}
        </div>
          </>
        )}

        {/* Client form dialog & delete confirmation */}
        <ClientFormDialog
          open={clientDialogOpen}
          onOpenChange={setClientDialogOpen}
          editingClientId={editingClientId}
          clientsList={clientsList}
          teamId={teamId}
          createClient={createClientMutation.mutateAsync}
          updateClient={updateClientMutation.mutateAsync}
          onSuccess={() => { setClientDialogOpen(false); setEditingClientId(null); }}
        />
        <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete client?</AlertDialogTitle>
              <AlertDialogDescription>Projects linked to this client will have the client unassigned. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteClientId) {
                    deleteClientMutation.mutate(deleteClientId, {
                      onSuccess: () => { setDeleteClientId(null); toast.success("Client deleted"); },
                      onError: () => toast.error("Failed to delete client"),
                    });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Detail view ──
  const currentRating = selected.rating || 0;
  const completedDeliverables = selected.deliverables.filter(d => d.completed).length;
  const budgetNum = Number(selected.budget);
  const budgetPercent = budgetNum > 0 ? Math.round((selected.spent / budgetNum) * 100) : 0;
  const hoursBudgetedNum = Number(selected.hoursBudgeted);
  const hoursPercent = hoursBudgetedNum > 0 ? Math.round((selected.hoursTracked / hoursBudgetedNum) * 100) : 0;
  const revisionSub = (selected.startDate && selected.dueDate && selected.startDate !== "—" && selected.dueDate !== "—")
    ? `${selected.startDate} → ${selected.dueDate}`
    : "—";
  const cfg = statusConfig[selected.status];

  const handleCopyClientLink = async () => {
    const segment = (selected as { slug?: string | null }).slug || selected.id;
    try {
      const res = await createTokenMutation.mutateAsync({ projectId: selected.id, expiresDays: 30 });
      if (res.ok && res.token) {
        const url = `${window.location.origin}/client/${segment}?token=${res.token}`;
        await navigator.clipboard.writeText(url);
        toast.success("Client link with token copied (valid 30 days)");
      } else {
        const fallbackUrl = `${window.location.origin}/client/${segment}`;
        await navigator.clipboard.writeText(fallbackUrl);
        toast.success("Client link copied (client must sign in)");
      }
    } catch {
      const fallbackUrl = `${window.location.origin}/client/${segment}`;
      await navigator.clipboard.writeText(fallbackUrl);
      toast.success("Client link copied");
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deliverables", label: "Deliverables" },
    { id: "messages", label: "Messages" },
    { id: "files", label: "Files" },
    { id: "activity", label: "Activity" },
    { id: "versions", label: "Versions" },
    { id: "invoices", label: "Invoices" },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button onClick={() => setSelectedId(null)} className="mt-1 p-2 rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{selected.client}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{selected.project} — {selected.description}</p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {revisionSub}</span>
            <span>·</span>
            <span>R{selected.revisionRound}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 text-xs"
            onClick={handleCopyClientLink}
            disabled={createTokenMutation.isPending}
          >
            <Copy className="w-3.5 h-3.5" />
            {createTokenMutation.isPending ? "Creating…" : "Copy Client Link"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 text-xs"
            onClick={() => window.open(`/client/${(selected as { slug?: string | null }).slug || selected.id}`, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </Button>
          {(selected.status === "approved" || selected.status === "changes") && (
            <Button size="sm" variant="outline" onClick={handleSendForReview} className="rounded-xl gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Send for Review
            </Button>
          )}
          {selected.status === "pending" && (
            <>
              <Button size="sm" onClick={handleApprove} className="rounded-xl gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleRequestChanges} className="rounded-xl gap-1.5">
                <PenLine className="w-3.5 h-3.5" /> Request Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 rounded-full bg-muted/40 p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Budget", value: `$${selected.spent.toLocaleString()}`, sub: budgetNum > 0 ? `of $${budgetNum.toLocaleString()} (${budgetPercent}%)` : "No budget set" },
                  { label: "Hours", value: `${selected.hoursTracked}h`, sub: hoursBudgetedNum > 0 ? `of ${hoursBudgetedNum}h (${hoursPercent}%)` : "—" },
                  { label: "Deliverables", value: `${completedDeliverables}/${selected.deliverables.length}`, sub: completedDeliverables === selected.deliverables.length ? "All done ✓" : `${selected.deliverables.length - completedDeliverables} remaining` },
                  { label: "Revisions", value: `R${selected.revisionRound}`, sub: revisionSub },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl font-bold mt-1">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Progress</h3>
                <ProgressTimeline milestones={selected.milestones} />
              </div>
              <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rating</h3>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => handleRate(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-125">
                      <Star className={cn("w-6 h-6 transition-colors", (hoverRating || currentRating) >= star ? "fill-foreground/60 text-foreground" : "text-border")} />
                    </button>
                  ))}
                  {currentRating > 0 && <span className="text-sm text-muted-foreground ml-3">{currentRating}.0</span>}
                </div>
              </div>
              <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                  <button onClick={() => setActiveTab("activity")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2.5">
                  {selected.activity.slice(0, 4).map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">{activityIcons[a.type]}</div>
                      <div>
                        <p className="text-xs">{a.description}</p>
                        <p className="text-[10px] text-muted-foreground">{a.actor} · {a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "deliverables" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{completedDeliverables} of {selected.deliverables.length} completed</p>
                <p className="text-2xl font-bold">{Math.round((completedDeliverables / selected.deliverables.length) * 100)}%</p>
              </div>
              <Progress value={(completedDeliverables / selected.deliverables.length) * 100} className="h-2 rounded-full" />
              <div className="space-y-2">
                {selected.deliverables.map(d => (
                  <button key={d.id} onClick={() => toggleDeliverable(d.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30 hover:bg-card/80 transition-colors text-left group">
                    <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                      d.completed ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground/40"
                    )}>
                      {d.completed && <CheckCircle2 className="w-3 h-3 text-background" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", d.completed && "line-through text-muted-foreground")}>{d.label}</p>
                      {d.dueDate && <p className="text-[10px] text-muted-foreground">Due {d.dueDate}</p>}
                    </div>
                    {!d.completed && <Badge variant="outline" className="text-[9px] h-5 border-foreground/15">Pending</Badge>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="flex flex-col rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 overflow-hidden shadow-sm min-h-[280px] max-h-[min(56vh,480px)]">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain chat-scrollbar">
                <div className="space-y-2 p-4 pb-2 min-h-[120px]">
                  {selected.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Start the conversation</p>
                    </div>
                  ) : (
                    <>
                      {selected.messages.map((msg, i) => (
                        <div key={(msg as { id?: string }).id ?? `msg-${i}`} className={cn("flex gap-2", msg.from === "You" ? "flex-row-reverse" : "flex-row")}>
                          <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0 text-xs font-semibold">
                            {msg.from === "You" ? "You".slice(0, 2) : msg.from.slice(0, 2).toUpperCase()}
                          </div>
                          <div className={cn("flex flex-col gap-0.5 max-w-[78%]", msg.from === "You" ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "px-3.5 py-2.5 rounded-2xl text-sm break-words",
                                msg.from === "You"
                                  ? "bg-foreground text-background rounded-br-md"
                                  : "bg-muted/40 rounded-bl-md"
                              )}
                            >
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
                              {msg.from === "You" ? "" : `${msg.from} · `}
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
                      <button
                        type="button"
                        onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end w-full p-3 pt-2 shrink-0 border-t border-border/30 bg-card/40">
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
                  className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-2xl bg-muted/40 border-border/40 flex-1 min-w-0 py-3 px-4 placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
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
          )}

          {activeTab === "files" && (
            <div className="space-y-2">
              {selected.files.map((file, i) => {
                const f = file as { id?: string; storage_path?: string };
                return (
                <div key={f.id ?? i} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30 hover:bg-card/80 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{file.size}{file.date ? ` · ${file.date}` : ""}</p>
                  </div>
                  {f.storage_path && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted/40"
                      onClick={async () => {
                        try {
                          const url = await getFileDownloadUrl(f.storage_path!);
                          window.open(url, "_blank");
                        } catch {
                          toast.error("Failed to download");
                        }
                      }}
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              );})}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border/40 hover:border-foreground/30 hover:bg-muted/10 transition-colors text-muted-foreground hover:text-foreground">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-medium">Upload files</span>
              </button>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-1">
              {selected.activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/15 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">{activityIcons[a.type]}</div>
                  <div>
                    <p className="text-sm">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground">{a.actor} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "versions" && (
            <div className="space-y-3">
              {selected.versions.map((v, i) => (
                <div key={v.id} className={cn("p-4 rounded-xl border transition-colors",
                  i === 0 ? "bg-foreground/5 border-foreground/15" : "bg-card/60 border-border/30"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{v.version}</span>
                      {i === 0 && <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-foreground/20">Latest</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{v.notes}</p>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5"><Paperclip className="w-3 h-3" />{v.filesCount} files</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="text-lg font-bold mt-1">${selected.invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paid</p>
                  <p className="text-lg font-bold mt-1">${selected.invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
                </div>
              </div>
              {selected.invoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30">
                  <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inv.label}</p>
                    <p className="text-[10px] text-muted-foreground">Due {inv.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${inv.amount.toLocaleString()}</p>
                    <span className={cn("text-[9px] font-medium px-2 py-0.5 rounded-full capitalize", invoiceStatusConfig[inv.status])}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};
