import { useState } from "react";
import { Plus, Send, Eye, FileText, Check, Clock, AlertCircle, X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSizeTier } from "./WidgetCard";

export interface Invoice {
  id: string; number: string; client: string; project: string; amount: number;
  status: "paid" | "pending" | "overdue" | "draft"; date: string; dueDate: string;
  items: { description: string; hours: number; rate: number }[];
}

const initialInvoices: Invoice[] = [
  { id: "1", number: "INV-001", client: "Flux Labs", project: "Brand Identity", amount: 4500, status: "paid", date: "2026-01-15", dueDate: "2026-02-15", items: [{ description: "Logo Design", hours: 12, rate: 150 }, { description: "Brand Guidelines", hours: 18, rate: 150 }] },
  { id: "2", number: "INV-002", client: "Mono Studio", project: "Website V2", amount: 6200, status: "pending", date: "2026-02-01", dueDate: "2026-03-01", items: [{ description: "UI Design", hours: 24, rate: 150 }, { description: "Prototyping", hours: 16, rate: 150 }, { description: "Design System", hours: 8, rate: 125 }] },
  { id: "3", number: "INV-003", client: "Nextwave", project: "Mobile App UI", amount: 3800, status: "overdue", date: "2026-01-01", dueDate: "2026-02-01", items: [{ description: "App Screen Design", hours: 20, rate: 150 }, { description: "Icon Set", hours: 6, rate: 130 }] },
];

const statusConfig: Record<string, { label: string; className: string; icon: typeof Check }> = {
  paid: { label: "Paid", className: "bg-foreground/10 text-foreground/70", icon: Check },
  pending: { label: "Pending", className: "bg-foreground/5 text-muted-foreground", icon: Clock },
  overdue: { label: "Overdue", className: "bg-foreground/10 text-foreground", icon: AlertCircle },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
};

export const InvoicesPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);
  const totalOutstanding = initialInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const overdue = initialInvoices.filter(i => i.status === "overdue").length;

  if (tier === "compact") return null;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">${(totalOutstanding / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">outstanding</p>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {initialInvoices.slice(0, 3).map((inv) => (
            <div key={inv.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
              <span className="text-[10px] font-medium truncate flex-1">{inv.number}</span>
              <span className="text-[9px] text-muted-foreground">${inv.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {overdue > 0 && (
          <span className="text-[9px] text-foreground font-medium mt-auto">{overdue} overdue</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">${(totalOutstanding / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted-foreground">outstanding</p>
        </div>
        {overdue > 0 && <span className="text-[10px] text-foreground font-medium">{overdue} overdue</span>}
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {initialInvoices.map((inv) => {
          const cfg = statusConfig[inv.status];
          return (
            <div key={inv.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
              <span className="text-[10px] font-medium truncate flex-1">{inv.number} — {inv.client}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span>
              <span className="text-[9px] text-muted-foreground">${inv.amount.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>{initialInvoices.length} invoices</span>
        <span>${initialInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()} total</span>
      </div>
    </div>
  );
};

export const InvoicesExpanded = () => {
  const [invoices] = useState(initialInvoices);
  const [selected, setSelected] = useState<Invoice | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
        <div className="flex items-center justify-between">
          <div><h3 className="text-lg font-bold">{selected.number}</h3><p className="text-xs text-muted-foreground">{selected.client} · {selected.project}</p></div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[selected.status].className}`}>{statusConfig[selected.status].label}</span>
        </div>
        <div className="space-y-2">
          {selected.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20">
              <div><p className="text-sm font-medium">{item.description}</p><p className="text-[10px] text-muted-foreground">{item.hours}h × ${item.rate}/h</p></div>
              <span className="text-sm font-semibold">${item.hours * item.rate}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-foreground/8">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-bold">${selected.amount.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map(inv => {
        const cfg = statusConfig[inv.status];
        return (
          <button key={inv.id} onClick={() => setSelected(inv)} className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
            <div>
              <div className="flex items-center gap-2"><span className="text-sm font-semibold">{inv.number}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span></div>
              <p className="text-xs text-muted-foreground">{inv.client} · {inv.project}</p>
            </div>
            <span className="text-sm font-bold">${inv.amount.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
};
