import { useMemo, useState } from "react";
import { CalendarDays, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTeamContext } from "@/contexts/TeamContext";
import { useProjects } from "@/hooks/useProjects";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarEvent } from "@/components/dashboard/CalendarWidget";

const COLORS = ["hsl(150 50% 40%)", "hsl(200 70% 50%)", "hsl(280 50% 50%)", "hsl(35 80% 50%)"];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(time: string) {
  if (!time || time === "all") return "All day";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const NotificationBar = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { teamId } = useTeamContext();
  const { data: projects = [] } = useProjects(teamId);
  const [dismissed, setDismissed] = useState(false);

  const todayStr = getDateStr(new Date());
  const todayEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    let i = 0;
    for (const p of projects) {
      const proj = p as { tasks?: { id: string; title: string; due_date: string | null }[]; milestones?: { id: string; title: string; due_date: string | null }[] };
      for (const t of proj.tasks ?? []) {
        if (t.due_date === todayStr) {
          events.push({
            id: `task-${t.id}`,
            title: t.title,
            date: todayStr,
            time: "09:00",
            duration: 0,
            color: COLORS[i % COLORS.length],
          });
          i++;
        }
      }
      for (const m of proj.milestones ?? []) {
        if (m.due_date === todayStr) {
          events.push({
            id: `milestone-${m.id}`,
            title: m.title,
            date: todayStr,
            time: "all",
            duration: 0,
            color: COLORS[i % COLORS.length],
          });
          i++;
        }
      }
    }
    return events;
  }, [projects, todayStr]);

  if (todayEvents.length === 0 || dismissed) return null;

  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="w-full mb-3"
        >
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/30 cursor-pointer"
            onClick={() => navigate("/widget/calendar")}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="flex-1 flex items-center gap-1.5 overflow-hidden min-w-0">
              <span className="text-[11px] font-semibold text-foreground shrink-0">
                {todayEvents.length} event{todayEvents.length > 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">·</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {todayEvents.map((e) => e.title).join(", ")}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              className="rounded p-0.5 shrink-0"
            >
              <X className="w-3 h-3 text-muted-foreground/40" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="w-full flex justify-center mb-3"
      >
        <div
          className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-border/30 cursor-pointer group"
          style={{
            background: "hsl(var(--card))",
            boxShadow:
              "0 1px 4px hsl(var(--foreground) / 0.05), 0 4px 12px hsl(var(--foreground) / 0.03)",
          }}
          onClick={() => navigate("/widget/calendar")}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">
              {todayEvents.length} event{todayEvents.length > 1 ? "s" : ""} today
            </span>
          </div>

          <div className="w-px h-4 bg-border/40" />

          <div className="flex items-center gap-2 overflow-hidden">
            {todayEvents.slice(0, 3).map((evt) => (
              <div key={evt.id} className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: evt.color }}
                />
                <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px]">
                  {evt.title}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {formatTime(evt.time)}
                </span>
              </div>
            ))}
          </div>

          <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground/60 transition-colors shrink-0" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="rounded p-0.5 hover:bg-muted/50 transition-colors shrink-0"
          >
            <X className="w-3 h-3 text-muted-foreground/50" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationBar;
