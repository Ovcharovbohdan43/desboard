import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, Clock, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSizeTier } from "./WidgetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayLabelsShort = ["M", "T", "W", "T", "F", "S", "S"];

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  color: string;
}

const COLOR_OPTIONS = [
  "hsl(0 0% 20%)",
  "hsl(220 14% 40%)",
  "hsl(0 60% 50%)",
  "hsl(200 70% 50%)",
  "hsl(150 50% 40%)",
  "hsl(35 80% 50%)",
  "hsl(280 50% 50%)",
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  { id: "1", title: "Client Review — Flux", date: getDateStr(18), time: "10:00", duration: 60, color: "hsl(0 0% 20%)" },
  { id: "2", title: "Design Sprint", date: getDateStr(20), time: "14:00", duration: 120, color: "hsl(200 70% 50%)" },
  { id: "3", title: "Hand-off Deadline", date: getDateStr(22), time: "17:00", duration: 30, color: "hsl(0 60% 50%)" },
  { id: "4", title: "Team Standup", date: getDateStr(new Date().getDate()), time: "09:00", duration: 30, color: "hsl(150 50% 40%)" },
  { id: "5", title: "Portfolio Review", date: getDateStr(new Date().getDate()), time: "14:00", duration: 90, color: "hsl(280 50% 50%)" },
];

function getDateStr(day: number) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function generateMonthCells(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  // pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Preview (for widget card) ──
export const CalendarPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = today.getDate();
  const month = today.toLocaleDateString("en-US", { month: "short" });

  if (tier === "compact") return null;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{dayNum}</p>
            <p className="text-[10px] text-muted-foreground">{dayName}</p>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {INITIAL_EVENTS.slice(0, 3).map((event) => (
            <div key={event.id} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: event.color }} />
              <span className="text-[10px] font-medium truncate flex-1">{event.title}</span>
              <span className="text-[8px] text-muted-foreground shrink-0">{formatTime(event.time)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // expanded preview — mini calendar + events
  const cells = generateMonthCells(today.getFullYear(), today.getMonth());
  const currentDay = today.getDate();
  const eventDays = INITIAL_EVENTS.map((e) => parseInt(e.date.split("-")[2]));

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight leading-none text-primary">{dayNum}</p>
        <p className="text-xs text-muted-foreground">{month} · {dayName}</p>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayLabelsShort.map((d, i) => (
          <span key={i} className="text-[7px] text-muted-foreground font-medium">{d}</span>
        ))}
        {cells.slice(0, 35).map((day, i) => (
          <div key={i} className={cn(
            "text-[8px] w-4 h-4 flex items-center justify-center rounded-full mx-auto",
            day === currentDay && "bg-foreground text-primary-foreground font-bold",
            day && eventDays.includes(day) && day !== currentDay && "ring-1 ring-foreground/30",
          )}>
            {day || ""}
          </div>
        ))}
      </div>
      <div className="space-y-1 mt-auto pt-1 border-t border-foreground/8">
        {INITIAL_EVENTS.slice(0, 3).map((event) => (
          <div key={event.id} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
            <span className="text-[10px] font-medium truncate flex-1">{event.title}</span>
            <span className="text-[8px] text-muted-foreground">{formatTime(event.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Expanded (full page) ──
type ViewMode = "month" | "week" | "day";

export const CalendarExpanded = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newDuration, setNewDuration] = useState("60");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);

  const cells = useMemo(() => generateMonthCells(currentYear, currentMonth), [currentYear, currentMonth]);
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDateStr = selectedDay ? formatDateStr(currentYear, currentMonth, selectedDay) : null;

  const dayEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return events.filter((e) => e.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedDateStr]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const navigateMonth = (dir: number) => {
    let m = currentMonth + dir;
    let y = currentYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCurrentMonth(m);
    setCurrentYear(y);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const addEvent = () => {
    if (!newTitle.trim() || !selectedDateStr) return;
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      date: selectedDateStr,
      time: newTime,
      duration: parseInt(newDuration),
      color: newColor,
    };
    setEvents((prev) => [...prev, event]);
    setNewTitle("");
    setNewTime("09:00");
    setNewDuration("60");
    setNewColor(COLOR_OPTIONS[0]);
    setShowAddForm(false);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // ── Week view helpers ──
  const getWeekDays = () => {
    const sel = selectedDay || today.getDate();
    const date = new Date(currentYear, currentMonth, sel);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Calendar grid */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold min-w-[180px] text-center">{monthName}</h2>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs text-muted-foreground ml-2">
              Today
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-1">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 capitalize",
                  viewMode === mode
                    ? "bg-foreground text-background shadow-md"
                    : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Month View */}
        {viewMode === "month" && (
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
            <div className="grid grid-cols-7 gap-1">
              {dayLabels.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {cells.map((day, i) => {
                const dateStr = day ? formatDateStr(currentYear, currentMonth, day) : "";
                const dayEvts = dateStr ? (eventsByDate[dateStr] || []) : [];
                return (
                  <button
                    key={i}
                    disabled={!day}
                    onClick={() => day && setSelectedDay(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-start rounded-xl p-1 text-sm transition-all relative",
                      !day && "invisible",
                      day && selectedDay === day && "bg-foreground text-background font-bold shadow-md",
                      day && isToday(day) && selectedDay !== day && "ring-2 ring-foreground/20",
                      day && selectedDay !== day && "hover:bg-muted/50 cursor-pointer",
                    )}
                  >
                    <span className="text-xs">{day}</span>
                    {dayEvts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvts.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: selectedDay === day ? "hsl(var(--background))" : evt.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm overflow-x-auto">
            <div className="grid grid-cols-8 min-w-[600px]">
              {/* Header row */}
              <div className="text-xs text-muted-foreground py-2" />
              {getWeekDays().map((date) => {
                const d = date.getDate();
                const isTdy = date.toDateString() === today.toDateString();
                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => {
                      setCurrentYear(date.getFullYear());
                      setCurrentMonth(date.getMonth());
                      setSelectedDay(date.getDate());
                    }}
                    className={cn(
                      "text-center py-2 cursor-pointer rounded-xl transition-colors",
                      isTdy && "bg-foreground/10"
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className={cn(
                      "text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto",
                      isTdy && "bg-foreground text-background",
                      selectedDay === d && currentMonth === date.getMonth() && !isTdy && "ring-2 ring-foreground/30"
                    )}>
                      {d}
                    </div>
                  </div>
                );
              })}

              {/* Time rows */}
              {HOURS.map((hour) => (
                <>
                  <div key={`label-${hour}`} className="text-[10px] text-muted-foreground text-right pr-2 py-3">
                    {hour % 12 || 12}{hour >= 12 ? "p" : "a"}
                  </div>
                  {getWeekDays().map((date) => {
                    const dateStr = formatDateStr(date.getFullYear(), date.getMonth(), date.getDate());
                    const hourStr = String(hour).padStart(2, "0");
                    const hourEvts = (eventsByDate[dateStr] || []).filter((e) => e.time.startsWith(hourStr));
                    return (
                      <div key={`${date.toISOString()}-${hour}`} className="border-t border-border/20 py-1 px-0.5 min-h-[40px]">
                        {hourEvts.map((evt) => (
                          <div
                            key={evt.id}
                            className="text-[9px] font-medium rounded-lg px-1.5 py-0.5 truncate mb-0.5 text-background"
                            style={{ background: evt.color }}
                          >
                            {evt.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === "day" && selectedDay && (
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">
              {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </h3>
            <div className="space-y-0">
              {HOURS.map((hour) => {
                const hourStr = String(hour).padStart(2, "0");
                const hourEvts = dayEvents.filter((e) => e.time.startsWith(hourStr));
                return (
                  <div key={hour} className="flex gap-3 border-t border-border/20 min-h-[48px]">
                    <div className="text-[11px] text-muted-foreground w-12 pt-2 text-right shrink-0">
                      {hour % 12 || 12}:00 {hour >= 12 ? "PM" : "AM"}
                    </div>
                    <div className="flex-1 py-1 space-y-1">
                      {hourEvts.map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-background"
                          style={{ background: evt.color }}
                        >
                          <div>
                            <p className="text-xs font-semibold">{evt.title}</p>
                            <p className="text-[10px] opacity-80">{formatTime(evt.time)} · {evt.duration}min</p>
                          </div>
                          <button onClick={() => deleteEvent(evt.id)} className="p-1 hover:opacity-70 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: Day detail sidebar */}
      <div className="lg:w-80 space-y-4">
        {/* Selected day info */}
        <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight">{selectedDay}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("en-US", {
                      weekday: "long", month: "long",
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="rounded-xl"
                >
                  {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              {/* Add event form */}
              {showAddForm && (
                <div className="space-y-3 mb-4 p-3 rounded-xl bg-muted/30 border border-border/20">
                  <Input
                    placeholder="Event title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-9 rounded-xl bg-background/60 border-border/30"
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-9 rounded-xl bg-background/60 border-border/30 flex-1"
                    />
                    <Select value={newDuration} onValueChange={setNewDuration}>
                      <SelectTrigger className="h-9 rounded-xl bg-background/60 border-border/30 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hr</SelectItem>
                        <SelectItem value="90">1.5 hr</SelectItem>
                        <SelectItem value="120">2 hr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Color:</span>
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all",
                          newColor === c ? "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <Button onClick={addEvent} size="sm" className="w-full rounded-xl" disabled={!newTitle.trim()}>
                    Add Event
                  </Button>
                </div>
              )}

              {/* Events list */}
              {dayEvents.length > 0 ? (
                <div className="space-y-2">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/15 group transition-colors hover:bg-muted/30"
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: evt.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{evt.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(evt.time)}</span>
                          <span>· {evt.duration}min</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEvent(evt.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No events this day</p>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a day to view details</p>
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 p-5 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</h4>
          <div className="space-y-2">
            {events
              .filter((e) => e.date >= formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()))
              .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
              .slice(0, 5)
              .map((evt) => {
                const evtDate = new Date(evt.date + "T00:00:00");
                return (
                  <div key={evt.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => {
                      setCurrentYear(evtDate.getFullYear());
                      setCurrentMonth(evtDate.getMonth());
                      setSelectedDay(evtDate.getDate());
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: evt.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {evtDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatTime(evt.time)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
