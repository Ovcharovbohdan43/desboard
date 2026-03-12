import { useState, useMemo } from "react";
import {
  Users, Briefcase, TrendingUp, FileText, DollarSign, UserPlus,
  ChevronRight, Star, Clock, CheckCircle2, Circle, ArrowUpRight,
  Building2, Phone, Mail, MapPin, Filter, Plus, MoreHorizontal,
  Pencil, Trash2, Search, ArrowUpDown, LayoutGrid, List,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { getSizeTier } from "./WidgetCard";

type FreelancerStatus = "available" | "on-project" | "unavailable";
type ContactType = "client" | "lead";
type ProposalStatus = "sent" | "draft" | "accepted" | "rejected";

interface Freelancer { id: string; name: string; role: string; rate: string; rating: number; status: FreelancerStatus; avatar: string; }
interface Deal { id: string; name: string; value: string; stage: string; probability: number; contact: string; }
interface Proposal { id: string; title: string; status: ProposalStatus; value: string; date: string; scope: string; }
interface Contact { id: string; name: string; company: string; email: string; phone: string; type: ContactType; }

const initialFreelancers: Freelancer[] = [
  { id: "1", name: "Ava Chen", role: "UI Designer", rate: "$85/hr", rating: 4.9, status: "available", avatar: "AC" },
  { id: "2", name: "Marcus Bell", role: "Motion Designer", rate: "$95/hr", rating: 4.7, status: "on-project", avatar: "MB" },
  { id: "3", name: "Lina Park", role: "Brand Strategist", rate: "$120/hr", rating: 5.0, status: "available", avatar: "LP" },
  { id: "4", name: "Tom Rivera", role: "3D Artist", rate: "$110/hr", rating: 4.6, status: "unavailable", avatar: "TR" },
  { id: "5", name: "Sara Kim", role: "Copywriter", rate: "$70/hr", rating: 4.8, status: "available", avatar: "SK" },
];

const initialDeals: Deal[] = [
  { id: "1", name: "Flux Labs Rebrand", value: "$24,000", stage: "Proposal Sent", probability: 75, contact: "Jamie Flux" },
  { id: "2", name: "Mono Studio Website", value: "$18,500", stage: "Negotiation", probability: 60, contact: "Alex Mono" },
  { id: "3", name: "Nextwave App Design", value: "$32,000", stage: "Qualified", probability: 40, contact: "Sam Next" },
  { id: "4", name: "Aura Brand System", value: "$8,000", stage: "Closed Won", probability: 100, contact: "Dana Aura" },
];

const initialProposals: Proposal[] = [
  { id: "1", title: "Flux Labs Brand Identity", status: "sent", value: "$24,000", date: "Feb 15", scope: "Logo, Brand Guide, Collateral" },
  { id: "2", title: "Mono Website Redesign", status: "draft", value: "$18,500", date: "Feb 18", scope: "UX, UI, Development" },
  { id: "3", title: "Nextwave Mobile App", status: "accepted", value: "$32,000", date: "Feb 10", scope: "Research, Wireframes, UI, Handoff" },
];

const initialContacts: Contact[] = [
  { id: "1", name: "Jamie Flux", company: "Flux Labs", email: "jamie@flux.co", phone: "+1 555-0101", type: "client" },
  { id: "2", name: "Alex Mono", company: "Mono Studio", email: "alex@mono.io", phone: "+1 555-0102", type: "lead" },
  { id: "3", name: "Sam Next", company: "Nextwave", email: "sam@nextwave.com", phone: "+1 555-0103", type: "lead" },
  { id: "4", name: "Dana Aura", company: "Aura Inc", email: "dana@aura.co", phone: "+1 555-0104", type: "client" },
];

const budgets = [
  { project: "Flux Labs Rebrand", budget: 24000, spent: 16800, remaining: 7200 },
  { project: "Mono Website", budget: 18500, spent: 4200, remaining: 14300 },
  { project: "Nextwave App", budget: 32000, spent: 28100, remaining: 3900 },
];

const stageColors: Record<string, string> = {
  "Qualified": "bg-muted text-muted-foreground",
  "Proposal Sent": "bg-foreground/10 text-foreground/70",
  "Negotiation": "bg-foreground/5 text-muted-foreground",
  "Closed Won": "bg-foreground/10 text-foreground",
  "Closed Lost": "bg-foreground/5 text-muted-foreground",
};

const statusColors: Record<string, string> = {
  available: "bg-foreground/30",
  "on-project": "bg-foreground/15",
  unavailable: "bg-foreground/8",
};

export const StudioPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);
  const available = initialFreelancers.filter(f => f.status === "available").length;
  const pipelineValue = "$82.5k";

  if (tier === "compact") return null;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{pipelineValue}</p>
            <p className="text-[10px] text-muted-foreground">pipeline</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {initialDeals.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand-primary)", opacity: 0.5 }} />
              <span className="text-[10px] font-medium truncate flex-1">{d.name}</span>
              <span className="text-[9px] text-muted-foreground">{d.value}</span>
            </div>
          ))}
        </div>
        <span className="text-[9px] text-muted-foreground mt-auto">{available} available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{pipelineValue}</p>
          <p className="text-xs text-muted-foreground">pipeline</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{available} available</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {initialDeals.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
            <span className="text-[10px] font-medium truncate flex-1">{d.name}</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${stageColors[d.stage] || "bg-muted text-muted-foreground"}`}>{d.stage}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>{initialDeals.length} deals</span>
        <span>{initialFreelancers.length} team</span>
      </div>
    </div>
  );
};

export const StudioExpanded = () => {
  const [tab, setTab] = useState("deals");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["deals", "team", "proposals", "contacts"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors", tab === t ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "deals" && (
        <div className="space-y-2">
          {initialDeals.map(d => (
            <div key={d.id} className="p-3 rounded-xl bg-secondary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{d.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stageColors[d.stage]}`}>{d.stage}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{d.contact}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-2">
          {initialFreelancers.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
              <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">{f.avatar}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">{f.role} · {f.rate}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${statusColors[f.status]}`} />
            </div>
          ))}
        </div>
      )}

      {tab === "proposals" && (
        <div className="space-y-2">
          {initialProposals.map(p => (
            <div key={p.id} className="p-3 rounded-xl bg-secondary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{p.title}</span>
                <span className="text-xs font-medium">{p.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{p.scope}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "contacts" && (
        <div className="space-y-2">
          {initialContacts.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
              <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">{c.name.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.company} · {c.email}</p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${c.type === "client" ? "bg-foreground/10 text-foreground/70" : "bg-muted text-muted-foreground"}`}>{c.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
