import { useState, useMemo, useEffect } from "react";
import {
  FileText, Image, FolderOpen, Film, Search, Plus, Tag, Users,
  ChevronRight, ChevronDown, Folder, MoreHorizontal, Grid3X3, List,
  Upload, Filter, X, File, Music, Archive, HardDrive, Star,
  Download, Trash2, Copy, Move, Eye, Edit2, Clock, ArrowUpDown, ExternalLink,
  CheckCircle2, Circle, Bookmark, Palette, FolderTree, Link2, Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { getSizeTier } from "./WidgetCard";
import { useTeamContext } from "@/contexts/TeamContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFileFolders, useCreateFolder } from "@/hooks/useFileFolders";
import { useFiles, useUploadFile, useDeleteFile, getFileDownloadUrl } from "@/hooks/useFiles";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";

/* ─── Process Tags ─── */
const PROCESS_TAGS = ["Final", "Draft", "On-going"] as const;
type ProcessTag = typeof PROCESS_TAGS[number];

/* ─── Mock Projects for linking ─── */
const MOCK_PROJECTS = [
  { id: "p1", name: "Website Redesign", client: "Acme Corp" },
  { id: "p2", name: "Brand Identity", client: "Stellar Labs" },
  { id: "p3", name: "Mobile App", client: "NovaTech" },
  { id: "p4", name: "Marketing Campaign", client: "Orbit Inc" },
  { id: "p5", name: "Dashboard MVP", client: "Zenith Co" },
];

/* ─── Upload Form State ─── */
interface UploadFormData {
  fileName: string;
  clientName: string;
  processTag: ProcessTag | "";
  linkedProjectId: string;
  version: number;
}

/* ─── Types ─── */
type FileTag = { label: string; color: string };
type ClientTag = { name: string; avatar: string };
type FileLabel = { text: string; color: string };
type FileItem = {
  id: string; name: string; type: "pdf" | "design" | "image" | "video" | "audio" | "archive" | "doc";
  folder: string; size: string; sizeBytes: number; addedBy: string; date: string;
  tags: FileTag[]; client?: ClientTag; label?: FileLabel; starred: boolean; version: number;
  description?: string;
};
type FolderItem = { id: string; name: string; parent: string | null; fileCount: number; color?: string };

/* ─── Data ─── */
const TAGS: FileTag[] = [
  { label: "Final", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  { label: "Draft", color: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  { label: "Review", color: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  { label: "Archived", color: "bg-muted text-muted-foreground border border-border/30" },
  { label: "Urgent", color: "bg-red-500/15 text-red-400 border border-red-500/20" },
  { label: "Approved", color: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" },
  { label: "WIP", color: "bg-purple-500/15 text-purple-400 border border-purple-500/20" },
];

const LABELS: FileLabel[] = [
  { text: "Important", color: "bg-red-500" },
  { text: "Client Ready", color: "bg-emerald-500" },
  { text: "Internal", color: "bg-blue-500" },
  { text: "Confidential", color: "bg-amber-500" },
  { text: "Template", color: "bg-purple-500" },
];

const CLIENTS: ClientTag[] = [
  { name: "Acme Corp", avatar: "AC" }, { name: "Stellar Labs", avatar: "SL" },
  { name: "NovaTech", avatar: "NT" }, { name: "Orbit Inc", avatar: "OI" },
  { name: "Zenith Co", avatar: "ZC" },
];

const FOLDERS: FolderItem[] = [
  { id: "all", name: "All Files", parent: null, fileCount: 0 },
  { id: "general", name: "General Knowledge", parent: null, fileCount: 10, color: "bg-blue-500" },
  { id: "onboarding", name: "Onboarding", parent: "general", fileCount: 3, color: "bg-sky-500" },
  { id: "sops", name: "SOPs & Guides", parent: "general", fileCount: 4, color: "bg-cyan-500" },
  { id: "design", name: "Design Assets", parent: null, fileCount: 14, color: "bg-purple-500" },
  { id: "branding", name: "Branding", parent: "design", fileCount: 6, color: "bg-violet-500" },
  { id: "mockups", name: "Mockups", parent: "design", fileCount: 5, color: "bg-fuchsia-500" },
  { id: "contracts", name: "Contracts", parent: null, fileCount: 7, color: "bg-amber-500" },
  { id: "proposals", name: "Proposals", parent: "contracts", fileCount: 3, color: "bg-orange-500" },
  { id: "templates", name: "Templates", parent: null, fileCount: 4, color: "bg-emerald-500" },
];

const initialFiles: FileItem[] = [
  { id: "1", name: "Onboarding-Guide.pdf", type: "pdf", folder: "onboarding", size: "4.2 MB", sizeBytes: 4200000, addedBy: "Kevin Park", date: "Feb 18, 2026", tags: [TAGS[0], TAGS[5]], client: CLIENTS[0], label: LABELS[1], starred: true, version: 3, description: "Complete onboarding guide for new team members" },
  { id: "2", name: "Product-Roadmap.docx", type: "doc", folder: "onboarding", size: "1.8 MB", sizeBytes: 1800000, addedBy: "Sarah Chen", date: "Feb 16, 2026", tags: [TAGS[2]], client: CLIENTS[1], label: LABELS[0], starred: false, version: 2, description: "Q1 2026 product roadmap and milestones" },
  { id: "3", name: "hero-mockup-v3.fig", type: "design", folder: "mockups", size: "18 MB", sizeBytes: 18000000, addedBy: "Jordan Lee", date: "Feb 15, 2026", tags: [TAGS[1], TAGS[6]], client: CLIENTS[0], starred: true, version: 3, description: "Landing page hero section design" },
  { id: "4", name: "brand-guide-final.pdf", type: "pdf", folder: "branding", size: "6.1 MB", sizeBytes: 6100000, addedBy: "Kevin Park", date: "Feb 14, 2026", tags: [TAGS[0]], client: CLIENTS[2], label: LABELS[1], starred: false, version: 1, description: "Brand identity guidelines" },
  { id: "5", name: "NDA-AcmeCorp.pdf", type: "pdf", folder: "contracts", size: "520 KB", sizeBytes: 520000, addedBy: "Sarah Chen", date: "Feb 11, 2026", tags: [TAGS[0]], client: CLIENTS[0], label: LABELS[3], starred: true, version: 1, description: "Non-disclosure agreement with Acme Corp" },
  { id: "6", name: "social-media-pack.zip", type: "archive", folder: "branding", size: "42 MB", sizeBytes: 42000000, addedBy: "Jordan Lee", date: "Feb 10, 2026", tags: [TAGS[0], TAGS[5]], client: CLIENTS[1], starred: false, version: 1, description: "Social media assets bundle" },
  { id: "7", name: "product-demo.mp4", type: "video", folder: "general", size: "120 MB", sizeBytes: 120000000, addedBy: "Kevin Park", date: "Feb 9, 2026", tags: [TAGS[2]], client: CLIENTS[3], starred: false, version: 2, description: "Product walkthrough demo video" },
  { id: "8", name: "podcast-ep12.mp3", type: "audio", folder: "general", size: "35 MB", sizeBytes: 35000000, addedBy: "Sarah Chen", date: "Feb 8, 2026", tags: [TAGS[0]], starred: false, version: 1, description: "Company podcast episode 12" },
  { id: "9", name: "wireframes-v2.fig", type: "design", folder: "mockups", size: "8.4 MB", sizeBytes: 8400000, addedBy: "Jordan Lee", date: "Feb 7, 2026", tags: [TAGS[1]], client: CLIENTS[2], label: LABELS[2], starred: true, version: 2, description: "Dashboard wireframes iteration 2" },
  { id: "10", name: "SOP-client-intake.pdf", type: "pdf", folder: "sops", size: "2.1 MB", sizeBytes: 2100000, addedBy: "Kevin Park", date: "Feb 6, 2026", tags: [TAGS[0]], label: LABELS[4], starred: false, version: 1, description: "Standard operating procedure for client intake" },
  { id: "11", name: "invoice-template.docx", type: "doc", folder: "templates", size: "890 KB", sizeBytes: 890000, addedBy: "Sarah Chen", date: "Feb 5, 2026", tags: [TAGS[0]], label: LABELS[4], starred: false, version: 3, description: "Reusable invoice template" },
  { id: "12", name: "proposal-zenith.pdf", type: "pdf", folder: "proposals", size: "3.4 MB", sizeBytes: 3400000, addedBy: "Jordan Lee", date: "Feb 4, 2026", tags: [TAGS[2]], client: CLIENTS[4], label: LABELS[0], starred: true, version: 1, description: "Project proposal for Zenith Co" },
  { id: "13", name: "hero-banner.png", type: "image", folder: "branding", size: "2.8 MB", sizeBytes: 2800000, addedBy: "Jordan Lee", date: "Feb 3, 2026", tags: [TAGS[0]], client: CLIENTS[0], starred: false, version: 2, description: "Website hero banner image" },
  { id: "14", name: "contract-template.docx", type: "doc", folder: "templates", size: "1.2 MB", sizeBytes: 1200000, addedBy: "Sarah Chen", date: "Feb 2, 2026", tags: [TAGS[0]], label: LABELS[4], starred: false, version: 4, description: "Standard contract template" },
];

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText, design: Palette, image: Image, video: Film, audio: Music, archive: Archive, doc: File,
};

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "text-red-400", design: "text-purple-400", image: "text-blue-400",
  video: "text-pink-400", audio: "text-amber-400", archive: "text-emerald-400", doc: "text-sky-400",
};

/* ─── Preview ─── */
function formatSizeShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export const FilesPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const { teamId } = useTeamContext();
  const { data: files = [] } = useFiles(null, teamId);
  const { data: folders = [] } = useFileFolders(teamId);

  const tier = getSizeTier(pixelSize);
  const rootFolderCount = folders.filter((f) => !f.parent_id).length;
  const totalSize = files.reduce((s, f) => s + ((f as { size_bytes?: number }).size_bytes ?? 0), 0);
  const STORAGE_LIMIT = 500 * 1024 * 1024;
  const usedPct = Math.min(100, Math.round((totalSize / STORAGE_LIMIT) * 100));
  const fileCount = files.length;

  if (tier === "compact") {
    return (
      <div className="flex flex-col h-full justify-center gap-1">
        <p className="text-lg font-bold tracking-tight text-primary">{fileCount}</p>
        <p className="text-[10px] text-muted-foreground">files</p>
        <div className="flex-1 min-h-2 mt-1">
          <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: "var(--brand-primary)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{fileCount}</p>
            <p className="text-[10px] text-muted-foreground">files</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {files.slice(0, 3).map((f: { id?: string; name: string }, i: number) => (
            <div key={f.id ?? `preview-${i}`} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0 opacity-50" style={{ background: "var(--brand-primary)" }} />
              <span className="text-[10px] font-medium truncate">{f.name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <div className="flex-1 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: "var(--brand-primary)" }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{usedPct}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{fileCount}</p>
          <p className="text-xs text-muted-foreground">files</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{rootFolderCount || FOLDERS.filter((f) => !f.parent).length} folders</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {files.slice(0, 4).map((f: { id?: string; name: string; type?: string; size?: string; size_bytes?: number }, i: number) => {
          const typeKey = f.type ?? (f as unknown as FileItem).type ?? "doc";
          const Icon = FILE_ICONS[typeKey] || File;
          const sizeStr = "size_bytes" in f && typeof f.size_bytes === "number" ? formatSizeShort(f.size_bytes) : (f as unknown as FileItem).size ?? "—";
          return (
            <div key={f.id ?? `preview-${i}`} className="flex items-center gap-2">
              <Icon className="w-3 h-3 text-foreground/30 shrink-0" />
              <span className="text-[10px] font-medium truncate flex-1">{f.name}</span>
              <span className="text-[8px] text-muted-foreground">{sizeStr}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-foreground/8">
        <div className="flex-1 h-1 bg-foreground/8 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${usedPct}%` }} />
        </div>
        <span className="text-[9px] text-muted-foreground">{usedPct}% used</span>
      </div>
    </div>
  );
};

/* ─── Expanded Full Page ─── */
export const FilesExpanded = () => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [search, setSearch] = useState("");
  const [currentFolder, setCurrentFolder] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["general", "design", "contracts"]));
  const [detailFile, setDetailFile] = useState<FileItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormData>({
    fileName: "", clientName: "", processTag: "", linkedProjectId: "", version: 1,
  });

  const resetUploadForm = () => {
    setUploadForm({ fileName: "", clientName: "", processTag: "", linkedProjectId: "", version: 1 });
    setShowUploadForm(false);
  };

  const handleUploadSubmit = () => {
    if (!uploadForm.fileName.trim()) return;
    const linkedProject = MOCK_PROJECTS.find(p => p.id === uploadForm.linkedProjectId);
    const client = uploadForm.clientName
      ? CLIENTS.find(c => c.name === uploadForm.clientName) || { name: uploadForm.clientName, avatar: uploadForm.clientName.slice(0, 2).toUpperCase() }
      : undefined;
    const processTagObj = uploadForm.processTag
      ? TAGS.find(t => t.label === uploadForm.processTag) || TAGS[0]
      : undefined;

    const newFile: FileItem = {
      id: `upload-${Date.now()}`,
      name: uploadForm.fileName,
      type: uploadForm.fileName.endsWith(".pdf") ? "pdf"
        : uploadForm.fileName.endsWith(".fig") ? "design"
        : uploadForm.fileName.match(/\.(png|jpg|jpeg|webp|svg)$/i) ? "image"
        : uploadForm.fileName.match(/\.(mp4|mov|avi)$/i) ? "video"
        : uploadForm.fileName.match(/\.(mp3|wav)$/i) ? "audio"
        : uploadForm.fileName.match(/\.(zip|rar|tar)$/i) ? "archive"
        : "doc",
      folder: currentFolder === "all" ? "general" : currentFolder,
      size: "0 KB",
      sizeBytes: 0,
      addedBy: "You",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      tags: processTagObj ? [processTagObj] : [],
      client,
      starred: false,
      version: uploadForm.version,
      description: linkedProject ? `Linked to ${linkedProject.name}` : undefined,
    };
    setFiles(prev => [newFile, ...prev]);
    resetUploadForm();
  };

  // Breadcrumb path
  const getBreadcrumb = (folderId: string): FolderItem[] => {
    const path: FolderItem[] = [];
    let current = FOLDERS.find(f => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parent ? FOLDERS.find(f => f.id === current!.parent) : undefined;
    }
    return path;
  };

  // Get all descendant folder IDs
  const getDescendantIds = (folderId: string): string[] => {
    const children = FOLDERS.filter(f => f.parent === folderId);
    return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
  };

  // Filtered & sorted files
  const filteredFiles = useMemo(() => {
    let result = files;

    // Folder filter
    if (currentFolder !== "all") {
      const folderIds = [currentFolder, ...getDescendantIds(currentFolder)];
      result = result.filter(f => folderIds.includes(f.folder));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.addedBy.toLowerCase().includes(q) ||
        f.client?.name.toLowerCase().includes(q)
      );
    }

    // Tag filter
    if (filterTag !== "all") {
      result = result.filter(f => f.tags.some(t => t.label === filterTag));
    }

    // Client filter
    if (filterClient !== "all") {
      result = result.filter(f => f.client?.name === filterClient);
    }

    // Label filter
    if (filterLabel !== "all") {
      result = result.filter(f => f.label?.text === filterLabel);
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter(f => f.type === filterType);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "size": return b.sizeBytes - a.sizeBytes;
        case "type": return a.type.localeCompare(b.type);
        default: return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return result;
  }, [files, currentFolder, search, filterTag, filterClient, filterLabel, filterType, sortBy]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const toggleStar = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, starred: !f.starred } : f));
  };

  const deleteFiles = (ids: string[]) => {
    setFiles(prev => prev.filter(f => !ids.includes(f.id)));
    setSelectedFiles(new Set());
    setDetailFile(null);
  };

  const addTag = (fileId: string, tag: FileTag) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      if (f.tags.some(t => t.label === tag.label)) return f;
      return { ...f, tags: [...f.tags, tag] };
    }));
  };

  const removeTag = (fileId: string, tagLabel: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, tags: f.tags.filter(t => t.label !== tagLabel) } : f
    ));
  };

  const setLabel = (fileId: string, label: FileLabel | undefined) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, label } : f));
  };

  const setClient = (fileId: string, client: ClientTag | undefined) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, client } : f));
  };

  const renameFile = (fileId: string, newName: string) => {
    if (!newName.trim()) return;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName.trim() } : f));
    setRenamingId(null);
  };

  const moveFile = (fileId: string, targetFolder: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, folder: targetFolder } : f));
  };

  const activeFilters = [filterTag, filterClient, filterLabel, filterType].filter(f => f !== "all").length;
  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const totalCapacity = 500000000; // 500 MB
  const usedPct = Math.round((totalSize / totalCapacity) * 100);

  // Render folder tree
  const renderFolderTree = (parentId: string | null, depth: number = 0) => {
    const children = FOLDERS.filter(f => f.parent === parentId && f.id !== "all");
    return children.map(folder => {
      const hasChildren = FOLDERS.some(f => f.parent === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isActive = currentFolder === folder.id;
      const folderFiles = files.filter(f => f.folder === folder.id).length;

      return (
        <div key={folder.id}>
          <button
            onClick={() => setCurrentFolder(folder.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              isActive ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} className="p-0.5">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : <div className="w-4" />}
            <div className={`w-2 h-2 rounded-full ${folder.color || "bg-muted-foreground"} shrink-0`} />
            <span className="truncate flex-1 text-left">{folder.name}</span>
            <span className="text-[10px] text-muted-foreground">{folderFiles}</span>
          </button>
          {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const FileIcon = ({ type }: { type: string }) => {
    const Icon = FILE_ICONS[type] || File;
    return <Icon className={`w-5 h-5 ${FILE_TYPE_COLORS[type] || "text-muted-foreground"} shrink-0`} />;
  };

  return (
    <div className={`flex gap-6 ${isMobile ? "flex-col h-full" : "h-[calc(100vh-10rem)]"}`}>
      {/* Mobile folder toggle + upload */}
      {isMobile && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-foreground/15 text-muted-foreground" onClick={() => setShowMobileFolders(!showMobileFolders)}>
            <FolderTree className="w-3.5 h-3.5" />
            {FOLDERS.find(f => f.id === currentFolder)?.name || "All Files"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showMobileFolders ? "rotate-180" : ""}`} />
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-dashed border-foreground/15 text-muted-foreground" onClick={() => setShowUploadForm(true)}>
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
        </div>
      )}

      {/* Mobile folder drawer */}
      {isMobile && showMobileFolders && (
        <div className="rounded-xl bg-foreground/3 border border-foreground/8 p-3 space-y-0.5">
          <button
            onClick={() => { setCurrentFolder("all"); setShowMobileFolders(false); }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              currentFolder === "all" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span className="flex-1 text-left">All Files</span>
            <span className="text-[10px] text-muted-foreground">{files.length}</span>
          </button>
          {FOLDERS.filter(f => !f.parent && f.id !== "all").map(folder => (
            <button
              key={folder.id}
              onClick={() => { setCurrentFolder(folder.id); setShowMobileFolders(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                currentFolder === folder.id ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${folder.color || "bg-muted-foreground"} shrink-0`} />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className="text-[10px] text-muted-foreground">{folder.fileCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sidebar — Folder Tree (desktop only) */}
      {!isMobile && (
      <div className="w-56 shrink-0 flex flex-col gap-3">
        <Button variant="outline" className="w-full gap-2 rounded-xl border-dashed border-foreground/15 text-muted-foreground hover:text-foreground" onClick={() => setShowUploadForm(true)}>
          <Upload className="w-4 h-4" /> Upload Files
        </Button>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5">
            <button
              onClick={() => setCurrentFolder("all")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                currentFolder === "all" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/5"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span className="flex-1 text-left">All Files</span>
              <span className="text-[10px] text-muted-foreground">{files.length}</span>
            </button>

            <button
              onClick={() => {
                setFiles(prev => {
                  const starredFiles = prev.filter(f => f.starred);
                  return prev;
                });
                setCurrentFolder("all");
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-foreground/5 transition-colors"
            >
              <Star className="w-4 h-4" />
              <span className="flex-1 text-left">Starred</span>
              <span className="text-[10px] text-muted-foreground">{files.filter(f => f.starred).length}</span>
            </button>

            <div className="h-px bg-border/30 my-2" />

            <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Folders</p>
            {renderFolderTree(null, 0)}
          </div>
        </ScrollArea>

        {/* Storage meter */}
        <div className="p-3 rounded-xl bg-foreground/5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">{(totalSize / 1000000).toFixed(0)} MB / 500 MB</span>
          </div>
          <Progress value={usedPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">{usedPct}% used</p>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {currentFolder === "all" ? (
            <span className="font-medium">All Files</span>
          ) : (
            getBreadcrumb(currentFolder).map((f, i, arr) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentFolder(f.id)}
                  className={`hover:text-foreground transition-colors ${i === arr.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {f.name}
                </button>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              </span>
            ))
          )}
        </div>

        {/* Toolbar */}
        <div className={`flex items-center gap-2 ${isMobile ? "flex-wrap" : "gap-3"}`}>
          <div className={`relative ${isMobile ? "w-full" : "flex-1 max-w-sm"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files…"
              className="pl-9 rounded-xl bg-foreground/5 border-foreground/10"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            {!isMobile && "Filters"}
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-foreground/20 text-[10px] flex items-center justify-center">{activeFilters}</span>
            )}
          </Button>

          {!isMobile && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-32 rounded-xl border-foreground/10">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex border border-foreground/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-28"}`}>
                  <Tag className="w-3 h-3 mr-1" /> <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {TAGS.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-32"}`}>
                  <Users className="w-3 h-3 mr-1" /> <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {CLIENTS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterLabel} onValueChange={setFilterLabel}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-32"}`}>
                  <Bookmark className="w-3 h-3 mr-1" /> <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labels</SelectItem>
                  {LABELS.map(l => <SelectItem key={l.text} value={l.text}>{l.text}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-28"}`}>
                  <File className="w-3 h-3 mr-1" /> <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                </SelectContent>
              </Select>

              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setFilterTag("all"); setFilterClient("all"); setFilterLabel("all"); setFilterType("all"); }}>
                  Clear all
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 p-2 rounded-xl bg-foreground/5 overflow-hidden"
            >
              <span className="text-xs font-medium">{selectedFiles.size} selected</span>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Download className="w-3 h-3" /> Download</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Move className="w-3 h-3" /> Move</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Tag className="w-3 h-3" /> Tag</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={() => deleteFiles(Array.from(selectedFiles))}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedFiles(new Set())}>
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Files */}
        <div className="flex gap-4 flex-1 min-h-0">
          <ScrollArea className="flex-1">
            {/* Select all header */}
            {viewMode === "list" && filteredFiles.length > 0 && !isMobile && (
              <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold border-b border-border/20">
                <button onClick={selectAll} className="shrink-0">
                  {selectedFiles.size === filteredFiles.length ? <CheckCircle2 className="w-3.5 h-3.5 text-foreground/40" /> : <Circle className="w-3.5 h-3.5" />}
                </button>
                <span className="flex-1">Name</span>
                <span className="w-20 text-right">Size</span>
                <span className="w-24">Date</span>
                <span className="w-24">Client</span>
                <span className="w-20">Tags</span>
                <span className="w-8" />
              </div>
            )}

            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <FolderOpen className="w-10 h-10 opacity-30" />
                <p className="text-sm">No files found</p>
                <p className="text-xs">Try adjusting your filters or search</p>
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-0.5">
                {filteredFiles.map(file => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl transition-colors cursor-pointer group/row ${
                      selectedFiles.has(file.id) ? "bg-foreground/8" : "hover:bg-foreground/4"
                    } ${detailFile?.id === file.id ? "ring-1 ring-foreground/15" : ""}`}
                    onClick={() => setDetailFile(file)}
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }} className="shrink-0">
                      {selectedFiles.has(file.id) ? <CheckCircle2 className="w-4 h-4 text-foreground/50" /> : <Circle className="w-4 h-4 text-foreground/15 group-hover/row:text-foreground/30" />}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }} className="shrink-0">
                      <Star className={`w-3.5 h-3.5 ${file.starred ? "fill-amber-400 text-amber-400" : "text-foreground/15 group-hover/row:text-foreground/25"}`} />
                    </button>

                    <FileIcon type={file.type} />

                    <div className="flex-1 min-w-0">
                      {renamingId === file.id ? (
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => renameFile(file.id, renameValue)}
                          onKeyDown={e => e.key === "Enter" && renameFile(file.id, renameValue)}
                          className="h-6 text-sm py-0 px-1"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            {file.label && (
                              <span className={`w-1.5 h-1.5 rounded-full ${file.label.color} shrink-0`} title={file.label.text} />
                            )}
                            {file.version > 1 && !isMobile && (
                              <span className="text-[9px] text-muted-foreground bg-foreground/5 px-1 rounded">v{file.version}</span>
                            )}
                          </div>
                          {isMobile && (
                            <p className="text-[10px] text-muted-foreground">{file.size} · {file.date}</p>
                          )}
                        </>
                      )}
                    </div>

                    {!isMobile && <span className="w-20 text-right text-xs text-muted-foreground">{file.size}</span>}
                    {!isMobile && <span className="w-24 text-xs text-muted-foreground">{file.date}</span>}

                    {!isMobile && (
                    <div className="w-24">
                      {file.client ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-foreground/10 text-[8px] font-bold flex items-center justify-center">{file.client.avatar}</span>
                          <span className="truncate">{file.client.name}</span>
                        </span>
                      ) : <span className="text-[10px] text-muted-foreground/30">—</span>}
                    </div>
                    )}

                    {!isMobile && (
                    <div className="w-20 flex gap-0.5 overflow-hidden">
                      {file.tags.slice(0, 2).map(t => (
                        <span key={t.label} className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 ${t.color}`}>{t.label}</span>
                      ))}
                      {file.tags.length > 2 && <span className="text-[8px] text-muted-foreground">+{file.tags.length - 2}</span>}
                    </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className={`w-8 flex items-center justify-center transition-opacity ${isMobile ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"}`}>
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => { setRenamingId(file.id); setRenameValue(file.name); }}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem><Download className="w-3.5 h-3.5 mr-2" /> Download</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                            <Move className="w-3.5 h-3.5 mr-2" /> Move to
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right">
                            {FOLDERS.filter(f => f.id !== "all" && f.id !== file.folder).map(f => (
                              <DropdownMenuItem key={f.id} onClick={() => moveFile(file.id, f.id)}>
                                <div className={`w-2 h-2 rounded-full ${f.color || "bg-muted-foreground"} mr-2`} />
                                {f.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenuSeparator />
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                            <Tag className="w-3.5 h-3.5 mr-2" /> Add Tag
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right">
                            {TAGS.filter(t => !file.tags.some(ft => ft.label === t.label)).map(t => (
                              <DropdownMenuItem key={t.label} onClick={() => addTag(file.id, t)}>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${t.color} mr-2`}>{t.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                            <Bookmark className="w-3.5 h-3.5 mr-2" /> Set Label
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right">
                            <DropdownMenuItem onClick={() => setLabel(file.id, undefined)}>None</DropdownMenuItem>
                            {LABELS.map(l => (
                              <DropdownMenuItem key={l.text} onClick={() => setLabel(file.id, l)}>
                                <div className={`w-2 h-2 rounded-full ${l.color} mr-2`} /> {l.text}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                            <Users className="w-3.5 h-3.5 mr-2" /> Assign Client
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right">
                            <DropdownMenuItem onClick={() => setClient(file.id, undefined)}>None</DropdownMenuItem>
                            {CLIENTS.map(c => (
                              <DropdownMenuItem key={c.name} onClick={() => setClient(file.id, c)}>
                                <span className="w-4 h-4 rounded-full bg-foreground/10 text-[8px] font-bold flex items-center justify-center mr-2">{c.avatar}</span>
                                {c.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={() => deleteFiles([file.id])}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredFiles.map(file => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className={`relative p-4 rounded-2xl transition-all cursor-pointer group/card ${
                      selectedFiles.has(file.id) ? "bg-foreground/8 ring-1 ring-foreground/15" : "bg-foreground/3 hover:bg-foreground/6"
                    } ${detailFile?.id === file.id ? "ring-1 ring-foreground/20" : ""}`}
                    onClick={() => setDetailFile(file)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-foreground/5`}>
                        <FileIcon type={file.type} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }}>
                          <Star className={`w-3.5 h-3.5 ${file.starred ? "fill-amber-400 text-amber-400" : "text-foreground/15"}`} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}>
                          {selectedFiles.has(file.id) ? <CheckCircle2 className="w-4 h-4 text-foreground/50" /> : <Circle className="w-4 h-4 text-foreground/15 opacity-0 group-hover/card:opacity-100" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-medium truncate mb-1">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">{file.size} · {file.date}</p>

                    {file.label && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${file.label.color}`} />
                        <span className="text-[10px] text-muted-foreground">{file.label.text}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {file.tags.slice(0, 2).map(t => (
                        <span key={t.label} className={`text-[8px] px-1.5 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                      ))}
                    </div>

                    {file.client && (
                      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-foreground/5">
                        <span className="w-4 h-4 rounded-full bg-foreground/10 text-[7px] font-bold flex items-center justify-center">{file.client.avatar}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{file.client.name}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Detail Panel */}
          <AnimatePresence>
            {detailFile && (
              isMobile ? (
                /* Mobile: full-screen overlay */
                <motion.div
                  initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-50 bg-background flex flex-col"
                >
                  <ScrollArea className="flex-1">
                    <div className="p-4 flex flex-col gap-4 pb-24">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-foreground/5">
                          <FileIcon type={detailFile.type} />
                        </div>
                        <button onClick={() => setDetailFile(null)} className="p-2 hover:bg-foreground/5 rounded-lg">
                          <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold break-words">{detailFile.name}</h3>
                        {detailFile.description && <p className="text-sm text-muted-foreground mt-1">{detailFile.description}</p>}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">{detailFile.size}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{detailFile.type}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span className="font-medium">{detailFile.date}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Added by</span><span className="font-medium">{detailFile.addedBy}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">v{detailFile.version}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Folder</span><span className="font-medium">{FOLDERS.find(f => f.id === detailFile.folder)?.name}</span></div>
                      </div>

                      {/* Label */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Label</p>
                        <div className="flex flex-wrap gap-1.5">
                          {LABELS.map(l => (
                            <button
                              key={l.text}
                              onClick={() => setLabel(detailFile.id, detailFile.label?.text === l.text ? undefined : l)}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                                detailFile.label?.text === l.text ? "bg-foreground/10 border-foreground/20 text-foreground" : "border-foreground/10 text-muted-foreground"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${l.color}`} />
                              {l.text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detailFile.tags.map(t => (
                            <span key={t.label} className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${t.color}`}>
                              {t.label}
                              <button onClick={() => { removeTag(detailFile.id, t.label); setDetailFile({ ...detailFile, tags: detailFile.tags.filter(tt => tt.label !== t.label) }); }}>
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-xs px-2.5 py-1 rounded-full border border-dashed border-foreground/15 text-muted-foreground">
                                <Plus className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {TAGS.filter(t => !detailFile.tags.some(ft => ft.label === t.label)).map(t => (
                                <DropdownMenuItem key={t.label} onClick={() => { addTag(detailFile.id, t); setDetailFile({ ...detailFile, tags: [...detailFile.tags, t] }); }}>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${t.color} mr-2`}>{t.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Client */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Client</p>
                        <Select
                          value={detailFile.client?.name || "none"}
                          onValueChange={(v) => {
                            const client = v === "none" ? undefined : CLIENTS.find(c => c.name === v);
                            setClient(detailFile.id, client);
                            setDetailFile({ ...detailFile, client });
                          }}
                        >
                          <SelectTrigger className="h-9 rounded-xl text-sm border-foreground/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No client</SelectItem>
                            {CLIENTS.map(c => (
                              <SelectItem key={c.name} value={c.name}>
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-foreground/10 text-[8px] font-bold flex items-center justify-center">{c.avatar}</span>
                                  {c.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl gap-1 text-sm border-foreground/10 h-10">
                          <Download className="w-4 h-4" /> Download
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-sm border-foreground/10 text-red-400 h-10" onClick={() => deleteFiles([detailFile.id])}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </motion.div>
              ) : (
                /* Desktop: side panel */
                <motion.div
                  initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="w-[280px] h-full rounded-2xl bg-foreground/3 border border-foreground/8 p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-foreground/5">
                        <FileIcon type={detailFile.type} />
                      </div>
                      <button onClick={() => setDetailFile(null)} className="p-1 hover:bg-foreground/5 rounded-lg">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold break-words">{detailFile.name}</h3>
                      {detailFile.description && <p className="text-xs text-muted-foreground mt-1">{detailFile.description}</p>}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">{detailFile.size}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{detailFile.type}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span className="font-medium">{detailFile.date}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Added by</span><span className="font-medium">{detailFile.addedBy}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">v{detailFile.version}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Folder</span><span className="font-medium">{FOLDERS.find(f => f.id === detailFile.folder)?.name}</span></div>
                    </div>

                    {/* Label */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Label</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LABELS.map(l => (
                          <button
                            key={l.text}
                            onClick={() => setLabel(detailFile.id, detailFile.label?.text === l.text ? undefined : l)}
                            className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-colors ${
                              detailFile.label?.text === l.text ? "bg-foreground/10 border-foreground/20 text-foreground" : "border-foreground/10 text-muted-foreground hover:border-foreground/20"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${l.color}`} />
                            {l.text}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detailFile.tags.map(t => (
                          <span key={t.label} className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 ${t.color}`}>
                            {t.label}
                            <button onClick={() => { removeTag(detailFile.id, t.label); setDetailFile({ ...detailFile, tags: detailFile.tags.filter(tt => tt.label !== t.label) }); }}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-[9px] px-2 py-0.5 rounded-full border border-dashed border-foreground/15 text-muted-foreground hover:text-foreground">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {TAGS.filter(t => !detailFile.tags.some(ft => ft.label === t.label)).map(t => (
                              <DropdownMenuItem key={t.label} onClick={() => { addTag(detailFile.id, t); setDetailFile({ ...detailFile, tags: [...detailFile.tags, t] }); }}>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${t.color} mr-2`}>{t.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Client */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Client</p>
                      <Select
                        value={detailFile.client?.name || "none"}
                        onValueChange={(v) => {
                          const client = v === "none" ? undefined : CLIENTS.find(c => c.name === v);
                          setClient(detailFile.id, client);
                          setDetailFile({ ...detailFile, client });
                        }}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs border-foreground/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No client</SelectItem>
                          {CLIENTS.map(c => (
                            <SelectItem key={c.name} value={c.name}>
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-foreground/10 text-[8px] font-bold flex items-center justify-center">{c.avatar}</span>
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-auto flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl gap-1 text-xs border-foreground/10">
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs border-foreground/10 text-red-400 hover:text-red-300" onClick={() => deleteFiles([detailFile.id])}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Upload Form Dialog ─── */}
      <Dialog open={showUploadForm} onOpenChange={(open) => { if (!open) resetUploadForm(); else setShowUploadForm(true); }}>
        <DialogContent className="sm:max-w-md bg-background border-foreground/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Upload New File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">File Name <span className="text-red-400">*</span></Label>
              <Input
                placeholder="e.g. brand-guide-v2.pdf"
                value={uploadForm.fileName}
                onChange={e => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                className="rounded-xl bg-foreground/5 border-foreground/10"
              />
            </div>

            {/* Client Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Client Name</Label>
              <Select value={uploadForm.clientName || "none"} onValueChange={v => setUploadForm(prev => ({ ...prev, clientName: v === "none" ? "" : v }))}>
                <SelectTrigger className="rounded-xl bg-foreground/5 border-foreground/10">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {CLIENTS.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-foreground/10 text-[8px] font-bold flex items-center justify-center">{c.avatar}</span>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Process Tag */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Process Tag</Label>
              <div className="flex gap-2 flex-wrap">
                {PROCESS_TAGS.map(tag => {
                  const isActive = uploadForm.processTag === tag;
                  const colorMap: Record<ProcessTag, string> = {
                    "Final": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    "Draft": "bg-amber-500/15 text-amber-400 border-amber-500/30",
                    "On-going": "bg-blue-500/15 text-blue-400 border-blue-500/30",
                  };
                  return (
                    <button
                      key={tag}
                      onClick={() => setUploadForm(prev => ({ ...prev, processTag: isActive ? "" : tag }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive ? colorMap[tag] : "border-foreground/10 text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Linking */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Link to Project
              </Label>
              <Select value={uploadForm.linkedProjectId || "none"} onValueChange={v => setUploadForm(prev => ({ ...prev, linkedProjectId: v === "none" ? "" : v }))}>
                <SelectTrigger className="rounded-xl bg-foreground/5 border-foreground/10">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {MOCK_PROJECTS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {p.name}
                        <span className="text-[10px] text-muted-foreground">— {p.client}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Version */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Version</Label>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded-lg border border-foreground/10 flex items-center justify-center text-sm hover:bg-foreground/5 transition-colors"
                  onClick={() => setUploadForm(prev => ({ ...prev, version: Math.max(1, prev.version - 1) }))}
                >
                  −
                </button>
                <span className="w-12 text-center font-mono text-sm font-medium">v{uploadForm.version}</span>
                <button
                  className="w-8 h-8 rounded-lg border border-foreground/10 flex items-center justify-center text-sm hover:bg-foreground/5 transition-colors"
                  onClick={() => setUploadForm(prev => ({ ...prev, version: prev.version + 1 }))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl border-foreground/10" onClick={resetUploadForm}>Cancel</Button>
            <Button
              className="rounded-xl"
              disabled={!uploadForm.fileName.trim()}
              onClick={handleUploadSubmit}
            >
              <Upload className="w-4 h-4 mr-1.5" /> Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── FilesExpandedBackend: Full API-driven File Storage ─── */
import type { FileRecord } from "@/api/files";
import type { FileFolder } from "@/api/fileFolders";
import { useUpdateFile } from "@/hooks/useFiles";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PROCESS_TAGS_BACKEND = ["Final", "Draft", "Review", "Archived", "Urgent", "WIP"] as const;

const PREVIEW_IMAGE_TYPES = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
const PREVIEW_VIDEO_TYPES = ["mp4", "webm", "ogg", "mov"];
const PREVIEW_AUDIO_TYPES = ["mp3", "wav", "ogg", "m4a"];
const PREVIEW_PDF_TYPES = ["pdf"];

function isPreviewableImage(type: string): boolean {
  return PREVIEW_IMAGE_TYPES.includes(type?.toLowerCase());
}
function isPreviewableVideo(type: string): boolean {
  return PREVIEW_VIDEO_TYPES.includes(type?.toLowerCase());
}
function isPreviewableAudio(type: string): boolean {
  return PREVIEW_AUDIO_TYPES.includes(type?.toLowerCase());
}
function isPreviewablePdf(type: string): boolean {
  return PREVIEW_PDF_TYPES.includes(type?.toLowerCase());
}

function isValidFileName(name: string): boolean {
  if (!name || !name.trim()) return false;
  const invalid = /[\\/:*?"<>|]/;
  return !invalid.test(name.trim());
}

const TAG_STYLES: Record<string, string> = {
  Final: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Review: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Archived: "bg-muted text-muted-foreground border-border/30",
  Urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  WIP: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

export const FilesExpandedBackend = () => {
  const isMobile = useIsMobile();
  const { teamId } = useTeamContext();
  const { user } = useAuthContext();
  const { data: folders = [], isLoading: foldersLoading } = useFileFolders(teamId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all" | "starred" | null>(null);
  const { data: files = [], isLoading: filesLoading } = useFiles(
    selectedFolderId === "all" || selectedFolderId === "starred" ? null : selectedFolderId,
    teamId
  );
  const { data: allFilesForStorage = [] } = useFiles(null, teamId);
  const { data: projects = [] } = useProjects(teamId);
  const createFolderMutation = useCreateFolder(teamId);
  const uploadMutation = useUploadFile(teamId);
  const deleteMutation = useDeleteFile(teamId);
  const updateFileMutation = useUpdateFile(teamId);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderForNew, setParentFolderForNew] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [detailFile, setDetailFile] = useState<FileRecord | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState<string[] | null>(null);
  const [detailPreviewUrl, setDetailPreviewUrl] = useState<string | null>(null);
  const [detailPreviewLoading, setDetailPreviewLoading] = useState(false);
  const [detailRenaming, setDetailRenaming] = useState(false);
  const [detailRenameValue, setDetailRenameValue] = useState("");

  const rootFolders = folders.filter((f) => !f.parent_id);
  const targetFolderId =
    selectedFolderId && selectedFolderId !== "all" && selectedFolderId !== "starred"
      ? selectedFolderId
      : rootFolders[0]?.id ?? null;

  useEffect(() => {
    if (selectedFolderId === null && rootFolders.length > 0) {
      setSelectedFolderId("all");
    }
  }, [rootFolders, selectedFolderId]);

  useEffect(() => {
    if (!detailFile) {
      setDetailPreviewUrl(null);
      setDetailPreviewLoading(false);
      setDetailRenaming(false);
      return;
    }
    const canPreview =
      isPreviewableImage(detailFile.type) ||
      isPreviewableVideo(detailFile.type) ||
      isPreviewableAudio(detailFile.type) ||
      isPreviewablePdf(detailFile.type);
    if (!canPreview) {
      setDetailPreviewUrl(null);
      setDetailPreviewLoading(false);
      return;
    }
    setDetailPreviewLoading(true);
    setDetailPreviewUrl(null);
    getFileDownloadUrl(detailFile.storage_path)
      .then((url) => {
        setDetailPreviewUrl(url);
      })
      .catch(() => {
        setDetailPreviewUrl(null);
      })
      .finally(() => {
        setDetailPreviewLoading(false);
      });
  }, [detailFile?.id, detailFile?.storage_path, detailFile?.type]);

  const getDescendantFolderIds = (folderId: string): string[] => {
    const children = folders.filter((f) => f.parent_id === folderId);
    return children.flatMap((c) => [c.id, ...getDescendantFolderIds(c.id)]);
  };

  const getBreadcrumb = (folderId: string): FileFolder[] => {
    const path: FileFolder[] = [];
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) ?? undefined : undefined;
    }
    return path;
  };

  const allTagValues = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => f.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let result = files;

    if (selectedFolderId === "starred") {
      result = result.filter((f) => f.starred);
    } else if (selectedFolderId && selectedFolderId !== "all") {
      const ids = [selectedFolderId, ...getDescendantFolderIds(selectedFolderId)];
      result = result.filter((f) => ids.includes(f.folder_id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    if (filterTag !== "all") {
      result = result.filter((f) => f.tags && f.tags.includes(filterTag));
    }
    if (filterType !== "all") {
      result = result.filter((f) => f.type === filterType);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.size_bytes - a.size_bytes;
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [files, selectedFolderId, search, filterTag, filterType, sortBy]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !teamId) return;
    createFolderMutation.mutate(
      {
        team_id: teamId,
        name: newFolderName.trim(),
        parent_id: parentFolderForNew,
        color: "hsl(220 10% 45%)",
      },
      {
        onSuccess: () => {
          setNewFolderName("");
          setParentFolderForNew(null);
          setShowCreateFolder(false);
          if (parentFolderForNew) setExpandedFolderIds((p) => new Set([...p, parentFolderForNew]));
          toast.success("Folder created");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create folder"),
      }
    );
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId || !targetFolderId) {
      toast.error("Select a folder first");
      return;
    }
    uploadMutation.mutate(
      {
        file,
        folderId: targetFolderId,
        addedBy: user?.id,
        projectId: uploadProjectId || null,
        tags: uploadTags.length ? uploadTags : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${file.name} uploaded`);
          setShowUploadDialog(false);
          setUploadProjectId("");
          setUploadTags([]);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Upload failed"),
      }
    );
    e.target.value = "";
  };

  const handleDownload = async (storagePath: string, name: string) => {
    try {
      const url = await getFileDownloadUrl(storagePath);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    } catch {
      toast.error("Download failed");
    }
  };

  const handleBulkDownload = async () => {
    const toDownload = filteredAndSortedFiles.filter((f) => selectedFiles.has(f.id));
    for (const f of toDownload) {
      await handleDownload(f.storage_path, f.name);
    }
    setSelectedFiles(new Set());
    if (toDownload.length > 1) toast.success(`Downloaded ${toDownload.length} files`);
  };

  const handleDelete = (id: string, storagePath: string) => {
    deleteMutation.mutate(
      { id, storagePath },
      {
        onSuccess: () => {
          toast.success("File deleted");
          setDetailFile((d) => (d?.id === id ? null : d));
          setSelectedFiles((s) => {
            const next = new Set(s);
            next.delete(id);
            return next;
          });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
      }
    );
  };

  const handleBulkDelete = () => {
    const toDelete = filteredAndSortedFiles.filter((f) => selectedFiles.has(f.id));
    toDelete.forEach((f) => handleDelete(f.id, f.storage_path));
    setSelectedFiles(new Set());
    setDetailFile(null);
  };

  const toggleStar = (file: FileRecord) => {
    updateFileMutation.mutate(
      { id: file.id, update: { starred: !file.starred } },
      {
        onSuccess: () => setDetailFile((d) => (d?.id === file.id ? { ...d, starred: !d.starred } : d)),
      }
    );
  };

  const updateFileTags = (file: FileRecord, tags: string[]) => {
    updateFileMutation.mutate(
      { id: file.id, update: { tags } },
      {
        onSuccess: () => setDetailFile((d) => (d?.id === file.id ? { ...d, tags } : d)),
      }
    );
  };

  const renameFile = (file: FileRecord, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenamingFileId(null);
      setDetailRenaming(false);
      return;
    }
    if (!isValidFileName(trimmed)) {
      toast.error("Invalid filename: cannot contain \\ / : * ? \" < > |");
      return;
    }
    if (trimmed === file.name) {
      setRenamingFileId(null);
      setDetailRenaming(false);
      return;
    }
    updateFileMutation.mutate(
      { id: file.id, update: { name: trimmed } },
      {
        onSuccess: () => {
          setRenamingFileId(null);
          setDetailRenaming(false);
          setDetailFile((d) => (d?.id === file.id ? { ...d, name: trimmed } : d));
          toast.success("File renamed");
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Rename failed");
        },
      }
    );
  };

  const moveFile = (file: FileRecord, folderId: string) => {
    updateFileMutation.mutate(
      { id: file.id, update: { folder_id: folderId } },
      {
        onSuccess: () => {
          setDetailFile((d) => (d?.id === file.id ? { ...d, folder_id: folderId } : d));
          setSelectedFiles((s) => {
            const next = new Set(s);
            next.delete(file.id);
            return next;
          });
          setShowMoveDialog(null);
          toast.success("Moved");
        },
      }
    );
  };

  const handleBulkMove = (folderId: string) => {
    const ids = showMoveDialog ?? [];
    filteredAndSortedFiles
      .filter((f) => ids.includes(f.id))
      .forEach((f) => moveFile(f, folderId));
    setShowMoveDialog(null);
    setSelectedFiles(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map((f) => f.id)));
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSize = useMemo(
    () => allFilesForStorage.reduce((s, f) => s + (f.size_bytes ?? 0), 0),
    [allFilesForStorage]
  );
  const STORAGE_LIMIT = 500 * 1024 * 1024; // 500 MB
  const usedPct = Math.min(100, Math.round((totalSize / STORAGE_LIMIT) * 100));
  const activeFilters = [filterTag, filterType].filter((f) => f !== "all").length;

  const getFileIconType = (type: string): keyof typeof FILE_ICONS => {
    const t = type?.toLowerCase() ?? "file";
    if (["pdf"].includes(t)) return "pdf";
    if (["fig", "sketch", "xd"].includes(t)) return "design";
    if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(t)) return "image";
    if (["mp4", "mov", "avi", "webm"].includes(t)) return "video";
    if (["mp3", "wav", "ogg"].includes(t)) return "audio";
    if (["zip", "rar", "tar", "gz"].includes(t)) return "archive";
    if (["doc", "docx", "txt"].includes(t)) return "doc";
    return "doc";
  };

  const renderFolderTree = (parentId: string | null, depth = 0) => {
    const items = folders.filter((f) => f.parent_id === parentId);
    return items.map((folder) => {
      const hasChildren = folders.some((f) => f.parent_id === folder.id);
      const isExpanded = expandedFolderIds.has(folder.id);
      const isActive = selectedFolderId === folder.id;
      const count = files.filter((f) => f.folder_id === folder.id).length;

      return (
        <div key={folder.id}>
          <button
            onClick={() => setSelectedFolderId(folder.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              isActive ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: folder.color || "hsl(var(--muted-foreground))" }}
            />
            <span className="truncate flex-1 text-left">{folder.name}</span>
            <span className="text-[10px] text-muted-foreground">{count}</span>
          </button>
          {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  if (!teamId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a team to manage files.
      </div>
    );
  }

  if (foldersLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Loading files…</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-6 ${isMobile ? "flex-col h-full" : "h-[calc(100vh-10rem)]"}`}>
      {/* Mobile folder toggle + upload */}
      {isMobile && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-foreground/15 text-muted-foreground"
            onClick={() => setShowMobileFolders(!showMobileFolders)}
          >
            <FolderTree className="w-3.5 h-3.5" />
            {selectedFolderId === "all"
              ? "All Files"
              : selectedFolderId === "starred"
                ? "Starred"
                : folders.find((f) => f.id === selectedFolderId)?.name ?? "Select folder"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showMobileFolders ? "rotate-180" : ""}`} />
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-dashed border-foreground/15 text-muted-foreground"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
        </div>
      )}

      {/* Mobile folder drawer */}
      {isMobile && showMobileFolders && (
        <div className="rounded-xl bg-foreground/3 border border-foreground/8 p-3 space-y-0.5">
          <button
            onClick={() => {
              setSelectedFolderId("all");
              setShowMobileFolders(false);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              selectedFolderId === "all" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span className="flex-1 text-left">All Files</span>
            <span className="text-[10px] text-muted-foreground">{files.length}</span>
          </button>
          <button
            onClick={() => {
              setSelectedFolderId("starred");
              setShowMobileFolders(false);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              selectedFolderId === "starred" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            <Star className="w-4 h-4" />
            <span className="flex-1 text-left">Starred</span>
            <span className="text-[10px] text-muted-foreground">{files.filter((f) => f.starred).length}</span>
          </button>
          {rootFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolderId(folder.id);
                setShowMobileFolders(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                selectedFolderId === folder.id ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: folder.color || "hsl(var(--muted-foreground))" }}
              />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className="text-[10px] text-muted-foreground">{files.filter((f) => f.folder_id === folder.id).length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sidebar — Desktop */}
      {!isMobile && (
        <div className="w-56 shrink-0 flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl border-dashed border-foreground/15 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCreateFolder(true)}
          >
            <Folder className="w-4 h-4" /> New Folder
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl border-dashed border-foreground/15 text-muted-foreground hover:text-foreground"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="w-4 h-4" /> Upload Files
          </Button>
          <input
            id="backend-file-upload-input"
            type="file"
            className="hidden"
            onChange={handleUpload}
          />

          <ScrollArea className="flex-1">
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedFolderId("all")}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedFolderId === "all" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/5"
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span className="flex-1 text-left">All Files</span>
                <span className="text-[10px] text-muted-foreground">{files.length}</span>
              </button>
              <button
                onClick={() => setSelectedFolderId("starred")}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedFolderId === "starred" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/5"
                }`}
              >
                <Star className="w-4 h-4" />
                <span className="flex-1 text-left">Starred</span>
                <span className="text-[10px] text-muted-foreground">{files.filter((f) => f.starred).length}</span>
              </button>
              <div className="h-px bg-border/30 my-2" />
              <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Folders</p>
              {renderFolderTree(null)}
            </div>
          </ScrollArea>

          <div className="p-3 rounded-xl bg-foreground/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium">{(totalSize / 1024 / 1024).toFixed(0)} MB / 500 MB</span>
            </div>
            <Progress value={Math.min(100, usedPct)} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{usedPct}% used</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {selectedFolderId === "all" ? (
            <span className="font-medium">All Files</span>
          ) : selectedFolderId === "starred" ? (
            <span className="font-medium">Starred</span>
          ) : selectedFolderId ? (
            getBreadcrumb(selectedFolderId).map((f, i, arr) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`hover:text-foreground transition-colors ${i === arr.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {f.name}
                </button>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">Select a folder</span>
          )}
        </div>

        {/* Toolbar */}
        <div className={`flex items-center gap-2 ${isMobile ? "flex-wrap" : "gap-3"}`}>
          <div className={`relative ${isMobile ? "w-full" : "flex-1 max-w-sm"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="pl-9 rounded-xl bg-foreground/5 border-foreground/10"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            {!isMobile && "Filters"}
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-foreground/20 text-[10px] flex items-center justify-center">{activeFilters}</span>
            )}
          </Button>

          {!isMobile && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-32 rounded-xl border-foreground/10">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex border border-foreground/10 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          {!isMobile && targetFolderId && (
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => document.getElementById("backend-file-upload-input")?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-28"}`}>
                  <Tag className="w-3 h-3 mr-1" /> <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTagValues.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  {PROCESS_TAGS_BACKEND.filter((t) => !allTagValues.includes(t)).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={`rounded-xl border-foreground/10 text-xs h-8 ${isMobile ? "flex-1 min-w-[calc(50%-4px)]" : "w-28"}`}>
                  <File className="w-3 h-3 mr-1" /> <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="docx">Document</SelectItem>
                  <SelectItem value="fig">Design</SelectItem>
                  <SelectItem value="png">Image</SelectItem>
                  <SelectItem value="jpg">Image</SelectItem>
                  <SelectItem value="mp4">Video</SelectItem>
                  <SelectItem value="zip">Archive</SelectItem>
                </SelectContent>
              </Select>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterTag("all");
                    setFilterType("all");
                  }}
                >
                  Clear all
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 p-2 rounded-xl bg-foreground/5 overflow-hidden"
            >
              <span className="text-xs font-medium">{selectedFiles.size} selected</span>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkDownload}>
                <Download className="w-3 h-3" /> Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowMoveDialog(Array.from(selectedFiles))}
              >
                <Move className="w-3 h-3" /> Move
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-red-400 hover:text-red-300"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedFiles(new Set())}>
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Files list/grid */}
        <div className="flex gap-4 flex-1 min-h-0">
          <ScrollArea className="flex-1">
            {filesLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading files…</span>
              </div>
            ) : filteredAndSortedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <FolderOpen className="w-10 h-10 opacity-30" />
                <p className="text-sm">No files found</p>
                <p className="text-xs">Try adjusting your filters, search, or upload files</p>
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-0.5">
                {!isMobile && (
                  <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold border-b border-border/20">
                    <button type="button" onClick={selectAll} className="shrink-0">
                      {selectedFiles.size === filteredAndSortedFiles.length ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-foreground/40" />
                      ) : (
                        <Circle className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="flex-1">Name</span>
                    <span className="w-20 text-right">Size</span>
                    <span className="w-24">Date</span>
                    <span className="w-20">Tags</span>
                    <span className="w-8" />
                  </div>
                )}
                {filteredAndSortedFiles.map((file) => {
                  const Icon = FILE_ICONS[getFileIconType(file.type)] || File;
                  return (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl transition-colors cursor-pointer group/row ${
                        selectedFiles.has(file.id) ? "bg-foreground/8" : "hover:bg-foreground/4"
                      } ${detailFile?.id === file.id ? "ring-1 ring-foreground/15" : ""}`}
                      onClick={() => setDetailFile(file)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(file.id);
                        }}
                        className="shrink-0"
                      >
                        {selectedFiles.has(file.id) ? (
                          <CheckCircle2 className="w-4 h-4 text-foreground/50" />
                        ) : (
                          <Circle className="w-4 h-4 text-foreground/15 group-hover/row:text-foreground/30" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(file);
                        }}
                        className="shrink-0"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${file.starred ? "fill-amber-400 text-amber-400" : "text-foreground/15 group-hover/row:text-foreground/25"}`}
                        />
                      </button>
                      <Icon className={`w-5 h-5 shrink-0 ${FILE_TYPE_COLORS[getFileIconType(file.type)] || "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        {renamingFileId === file.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => {
                              if (renameValue.trim()) renameFile(file, renameValue);
                              else setRenamingFileId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameFile(file, renameValue);
                              else if (e.key === "Escape") {
                                setRenameValue(file.name);
                                setRenamingFileId(null);
                                e.preventDefault();
                              }
                            }}
                            className="h-6 text-sm py-0 px-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <div className="flex items-center gap-2" onDoubleClick={(e) => { e.stopPropagation(); setRenamingFileId(file.id); setRenameValue(file.name); }}>
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              {file.version > 1 && !isMobile && (
                                <span className="text-[9px] text-muted-foreground bg-foreground/5 px-1 rounded">v{file.version}</span>
                              )}
                            </div>
                            {isMobile && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {!isMobile && <span className="w-20 text-right text-xs text-muted-foreground">{formatSize(file.size_bytes)}</span>}
                      {!isMobile && (
                        <span className="w-24 text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      )}
                      {!isMobile && (
                        <div className="w-20 flex gap-0.5 overflow-hidden flex-wrap">
                          {(file.tags ?? []).slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 border ${TAG_STYLES[t] ?? "bg-foreground/5 text-muted-foreground border-foreground/10"}`}
                            >
                              {t}
                            </span>
                          ))}
                          {(file.tags?.length ?? 0) > 2 && (
                            <span className="text-[8px] text-muted-foreground">+{(file.tags?.length ?? 0) - 2}</span>
                          )}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className={`w-8 flex items-center justify-center transition-opacity ${isMobile ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"}`}>
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => { setRenamingFileId(file.id); setRenameValue(file.name); }}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(file.storage_path, file.name)}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenu>
                            <DropdownMenuTrigger className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                              <Move className="w-3.5 h-3.5 mr-2" /> Move to
                              <ChevronRight className="w-3 h-3 ml-auto" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right">
                              {folders
                                .filter((f) => f.id !== file.folder_id)
                                .map((f) => (
                                  <DropdownMenuItem key={f.id} onClick={() => moveFile(file, f.id)}>
                                    <div
                                      className="w-2 h-2 rounded-full mr-2 shrink-0"
                                      style={{ background: f.color || "hsl(var(--muted-foreground))" }}
                                    />
                                    {f.name}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => handleDelete(file.id, file.storage_path)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredAndSortedFiles.map((file) => {
                  const Icon = FILE_ICONS[getFileIconType(file.type)] || File;
                  return (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative p-4 rounded-2xl transition-all cursor-pointer group/card ${
                        selectedFiles.has(file.id) ? "bg-foreground/8 ring-1 ring-foreground/15" : "bg-foreground/3 hover:bg-foreground/6"
                      } ${detailFile?.id === file.id ? "ring-1 ring-foreground/20" : ""}`}
                      onClick={() => setDetailFile(file)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-foreground/5">
                          <Icon className={`w-5 h-5 ${FILE_TYPE_COLORS[getFileIconType(file.type)] || "text-muted-foreground"}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(file);
                            }}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${file.starred ? "fill-amber-400 text-amber-400" : "text-foreground/15"}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(file.id);
                            }}
                          >
                            {selectedFiles.has(file.id) ? (
                              <CheckCircle2 className="w-4 h-4 text-foreground/50" />
                            ) : (
                              <Circle className="w-4 h-4 text-foreground/15 opacity-0 group-hover/card:opacity-100" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium truncate mb-1">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        {formatSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(file.tags ?? []).slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className={`text-[8px] px-1.5 py-0.5 rounded-full ${TAG_STYLES[t] ?? "bg-foreground/5 text-muted-foreground"}`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Detail panel */}
          <AnimatePresence>
            {detailFile && (
              isMobile ? (
                <motion.div
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-50 bg-background flex flex-col"
                >
                  <ScrollArea className="flex-1">
                    <div className="p-4 flex flex-col gap-4 pb-24">
                      {/* Preview area */}
                      <div className="rounded-xl bg-foreground/5 border border-foreground/10 overflow-hidden aspect-video min-h-[160px] flex items-center justify-center relative">
                        {detailPreviewLoading ? (
                          <div className="animate-pulse text-muted-foreground text-sm">Loading preview…</div>
                        ) : detailPreviewUrl && isPreviewableImage(detailFile.type) ? (
                          <img src={detailPreviewUrl} alt={detailFile.name} className="max-w-full max-h-[240px] object-contain" />
                        ) : detailPreviewUrl && isPreviewablePdf(detailFile.type) ? (
                          <iframe src={detailPreviewUrl} title={detailFile.name} className="w-full h-[240px] border-0" />
                        ) : detailPreviewUrl && isPreviewableVideo(detailFile.type) ? (
                          <video src={detailPreviewUrl} controls className="max-w-full max-h-[240px]" />
                        ) : detailPreviewUrl && isPreviewableAudio(detailFile.type) ? (
                          <div className="w-full p-4 flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center">
                              {(() => { const Icon = FILE_ICONS[getFileIconType(detailFile.type)] || File; return <Icon className="w-8 h-8 text-muted-foreground" />; })()}
                            </div>
                            <audio src={detailPreviewUrl} controls className="w-full max-w-xs" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-foreground/5">
                            {(() => { const Icon = FILE_ICONS[getFileIconType(detailFile.type)] || File; return <Icon className="w-8 h-8 text-muted-foreground" />; })()}
                          </div>
                        )}
                        {detailPreviewUrl && (
                          <a
                            href={detailPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        {detailRenaming ? (
                          <Input
                            value={detailRenameValue}
                            onChange={(e) => setDetailRenameValue(e.target.value)}
                            onBlur={() => renameFile(detailFile, detailRenameValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameFile(detailFile, detailRenameValue);
                              else if (e.key === "Escape") {
                                setDetailRenameValue(detailFile.name);
                                setDetailRenaming(false);
                                e.preventDefault();
                              }
                            }}
                            className="flex-1 h-9 text-base font-semibold"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-base font-semibold break-words flex-1">{detailFile.name}</h3>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {!detailRenaming && (
                            <button
                              type="button"
                              onClick={() => { setDetailRenaming(true); setDetailRenameValue(detailFile.name); }}
                              className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => setDetailFile(null)} className="p-2 hover:bg-foreground/5 rounded-lg">
                            <X className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size</span>
                          <span className="font-medium">{formatSize(detailFile.size_bytes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium">{detailFile.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added</span>
                          <span className="font-medium">{new Date(detailFile.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version</span>
                          <span className="font-medium">v{detailFile.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Folder</span>
                          <span className="font-medium">{folders.find((f) => f.id === detailFile.folder_id)?.name ?? "—"}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(detailFile.tags ?? []).map((t) => (
                            <span
                              key={t}
                              className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border ${TAG_STYLES[t] ?? "bg-foreground/5 border-foreground/10"}`}
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() =>
                                  updateFileTags(detailFile, (detailFile.tags ?? []).filter((tt) => tt !== t))
                                }
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-foreground/15 text-muted-foreground"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {PROCESS_TAGS_BACKEND.filter((t) => !(detailFile.tags ?? []).includes(t)).map((t) => (
                                <DropdownMenuItem
                                  key={t}
                                  onClick={() => updateFileTags(detailFile, [...(detailFile.tags ?? []), t])}
                                >
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${TAG_STYLES[t] ?? ""} mr-2`}>{t}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl gap-1 text-sm border-foreground/10 h-10"
                          onClick={() => handleDownload(detailFile.storage_path, detailFile.name)}
                        >
                          <Download className="w-4 h-4" /> Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-sm border-foreground/10 text-red-400 h-10"
                          onClick={() => handleDelete(detailFile.id, detailFile.storage_path)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 360, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="w-[360px] h-full rounded-2xl bg-foreground/3 border border-foreground/8 p-5 flex flex-col gap-4">
                    {/* Preview */}
                    <div className="rounded-xl bg-foreground/5 border border-foreground/10 overflow-hidden aspect-video min-h-[140px] flex items-center justify-center shrink-0 relative">
                      {detailPreviewLoading ? (
                        <div className="animate-pulse text-muted-foreground text-xs">Loading…</div>
                      ) : detailPreviewUrl && isPreviewableImage(detailFile.type) ? (
                        <img src={detailPreviewUrl} alt={detailFile.name} className="max-w-full max-h-[180px] object-contain" />
                      ) : detailPreviewUrl && isPreviewablePdf(detailFile.type) ? (
                        <iframe src={detailPreviewUrl} title={detailFile.name} className="w-full h-[180px] border-0" />
                      ) : detailPreviewUrl && isPreviewableVideo(detailFile.type) ? (
                        <video src={detailPreviewUrl} controls className="max-w-full max-h-[180px]" />
                      ) : detailPreviewUrl && isPreviewableAudio(detailFile.type) ? (
                        <div className="w-full p-3 flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
                            {(() => { const Icon = FILE_ICONS[getFileIconType(detailFile.type)] || File; return <Icon className="w-6 h-6 text-muted-foreground" />; })()}
                          </div>
                          <audio src={detailPreviewUrl} controls className="w-full max-w-[200px] h-8" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-foreground/5">
                          {(() => { const Icon = FILE_ICONS[getFileIconType(detailFile.type)] || File; return <Icon className="w-7 h-7 text-muted-foreground" />; })()}
                        </div>
                      )}
                      {detailPreviewUrl && (
                        <a
                          href={detailPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      {detailRenaming ? (
                        <Input
                          value={detailRenameValue}
                          onChange={(e) => setDetailRenameValue(e.target.value)}
                          onBlur={() => renameFile(detailFile, detailRenameValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameFile(detailFile, detailRenameValue);
                            else if (e.key === "Escape") {
                              setDetailRenameValue(detailFile.name);
                              setDetailRenaming(false);
                              e.preventDefault();
                            }
                          }}
                          className="flex-1 min-w-0 h-8 text-sm font-semibold"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-sm font-semibold break-words flex-1 min-w-0">{detailFile.name}</h3>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!detailRenaming && (
                          <button
                            type="button"
                            onClick={() => { setDetailRenaming(true); setDetailRenameValue(detailFile.name); }}
                            className="p-1.5 hover:bg-foreground/5 rounded-lg text-muted-foreground"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => setDetailFile(null)} className="p-1.5 hover:bg-foreground/5 rounded-lg">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium">{formatSize(detailFile.size_bytes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{detailFile.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Added</span>
                        <span className="font-medium">{new Date(detailFile.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">v{detailFile.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Folder</span>
                        <span className="font-medium">{folders.find((f) => f.id === detailFile.folder_id)?.name ?? "—"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailFile.tags ?? []).map((t) => (
                          <span
                            key={t}
                            className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 border ${TAG_STYLES[t] ?? "bg-foreground/5 border-foreground/10"}`}
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() =>
                                updateFileTags(detailFile, (detailFile.tags ?? []).filter((tt) => tt !== t))
                              }
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-[9px] px-2 py-0.5 rounded-full border border-dashed border-foreground/15 text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {PROCESS_TAGS_BACKEND.filter((t) => !(detailFile.tags ?? []).includes(t)).map((t) => (
                              <DropdownMenuItem
                                key={t}
                                onClick={() => updateFileTags(detailFile, [...(detailFile.tags ?? []), t])}
                              >
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${TAG_STYLES[t] ?? ""} mr-2`}>{t}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl gap-1 text-xs border-foreground/10"
                        onClick={() => handleDownload(detailFile.storage_path, detailFile.name)}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs border-foreground/10 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(detailFile.id, detailFile.storage_path)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="sm:max-w-md bg-background border-foreground/10">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Folder name</Label>
              <Input
                placeholder="e.g. Design Assets"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="rounded-xl mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
            {folders.length > 0 && (
              <div>
                <Label>Parent folder (optional)</Label>
                <Select value={parentFolderForNew ?? "root"} onValueChange={(v) => setParentFolderForNew(v === "root" ? null : v)}>
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Root (no parent)</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateFolder(false); setNewFolderName(""); setParentFolderForNew(null); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload metadata dialog (trigger upload after selecting file) */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md bg-background border-foreground/10">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {targetFolderId
                ? "Choose file to upload. You can optionally link a project and add tags."
                : "Create at least one folder first, then upload files."}
            </p>
            {targetFolderId && (
              <>
                <div>
                  <Label>Link to project (optional)</Label>
                  <Select value={uploadProjectId || "none"} onValueChange={(v) => setUploadProjectId(v === "none" ? "" : v)}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags (optional)</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PROCESS_TAGS_BACKEND.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setUploadTags((prev) =>
                            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          uploadTags.includes(t) ? "bg-foreground/10 border-foreground/20" : "border-foreground/10"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full rounded-xl"
                  onClick={() => document.getElementById("backend-file-upload-input")?.click()}
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" /> Choose file to upload
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Dialog */}
      {showMoveDialog && showMoveDialog.length > 0 && (
        <Dialog open={!!showMoveDialog} onOpenChange={() => setShowMoveDialog(null)}>
          <DialogContent className="sm:max-w-md bg-background border-foreground/10">
            <DialogHeader>
              <DialogTitle>Move {showMoveDialog.length} file(s) to</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-64 overflow-auto">
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleBulkMove(f.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-foreground/5 text-left"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: f.color || "hsl(var(--muted-foreground))" }}
                  />
                  {f.name}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
