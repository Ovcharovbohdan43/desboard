import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent } from
"@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from
"@dnd-kit/sortable";
import {
  FolderKanban, CalendarDays, Users, DollarSign, HardDrive,
  Receipt, Bell, Briefcase, Search, SlidersHorizontal,
  ArrowUpRight, ListTodo, MessageSquare, BarChart3, LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

import NotificationBar from "@/components/dashboard/NotificationBar";
import WidgetCard from "@/components/dashboard/WidgetCard";
// WidgetExpandedView no longer used — widgets navigate to full page
import { ProjectsPreview, ProjectsExpanded } from "@/components/dashboard/ProjectsWidget";
import { CalendarPreview, CalendarExpanded } from "@/components/dashboard/CalendarWidget";
import { ClientsPreview, ClientsExpanded } from "@/components/dashboard/ClientPortalWidget";
import { FinancesPreview, FinancesExpanded } from "@/components/dashboard/FinancesWidget";
import { FilesPreview, FilesExpanded } from "@/components/dashboard/FileStorageWidget";

import { TasksPreview, TasksExpanded } from "@/components/dashboard/TasksWidget";
import { MessagesPreview, MessagesExpanded } from "@/components/dashboard/MessagesWidget";
import { AnalyticsPreview, AnalyticsExpanded } from "@/components/dashboard/AnalyticsWidget";
import { WorkspacePreview, WorkspaceExpanded } from "@/components/dashboard/WorkspaceWidget";
import WidgetCustomizer from "@/components/dashboard/WidgetCustomizer";
import { useIsMobile } from "@/hooks/use-mobile";
import { isWidgetEnabled } from "@/lib/featureFlags";

type WidgetId = "projects" | "calendar" | "finances" | "clients" | "files" | "tasks" | "messages" | "analytics" | "workspace";

const WIDGETS: Record<
  WidgetId,
  {
    title: string;
    icon: React.ReactNode;
    accentColor: string;
    preview: React.ComponentType<{pixelSize?: {width: number;height: number;};}>;
    expanded: React.ComponentType;
    cols: number;
    accent?: boolean;
    component: React.ComponentType;
    bgColor: string;
    textColor: string;
  }> =
{
  projects: {
    title: "Projects",
    icon: <FolderKanban className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: ProjectsPreview,
    expanded: ProjectsExpanded,
    cols: 1,
    component: ProjectsPreview,
    bgColor: "",
    textColor: ""
  },
  calendar: {
    title: "Calendar",
    icon: <CalendarDays className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: CalendarPreview,
    expanded: CalendarExpanded,
    cols: 1,
    component: CalendarPreview,
    bgColor: "",
    textColor: ""
  },
  finances: {
    title: "Finances",
    icon: <DollarSign className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: FinancesPreview,
    expanded: FinancesExpanded,
    cols: 1,
    component: FinancesPreview,
    bgColor: "",
    textColor: ""
  },
  clients: {
    title: "Client Portal",
    icon: <Users className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: ClientsPreview,
    expanded: ClientsExpanded,
    cols: 1,
    component: ClientsPreview,
    bgColor: "",
    textColor: ""
  },
  files: {
    title: "Files",
    icon: <HardDrive className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: FilesPreview,
    expanded: FilesExpanded,
    cols: 1,
    component: FilesPreview,
    bgColor: "",
    textColor: ""
  },
  tasks: {
    title: "Tasks",
    icon: <ListTodo className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: TasksPreview,
    expanded: TasksExpanded,
    cols: 1,
    component: TasksPreview,
    bgColor: "",
    textColor: ""
  },
  messages: {
    title: "Messages",
    icon: <MessageSquare className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: MessagesPreview,
    expanded: MessagesExpanded,
    cols: 1,
    component: MessagesPreview,
    bgColor: "",
    textColor: ""
  },
  analytics: {
    title: "Analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: AnalyticsPreview,
    expanded: AnalyticsExpanded,
    cols: 1,
    component: AnalyticsPreview,
    bgColor: "",
    textColor: ""
  },
  workspace: {
    title: "Workspace",
    icon: <Briefcase className="w-4 h-4" />,
    accentColor: "var(--brand-primary)",
    preview: WorkspacePreview,
    expanded: WorkspaceExpanded,
    cols: 1,
    component: WorkspacePreview,
    bgColor: "",
    textColor: ""
  }
};

const DEFAULT_WIDGETS: WidgetId[] = ["projects", "calendar", "finances", "clients", "files", "tasks", "messages", "analytics", "workspace"];

const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { data: profile } = useProfile();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS);
  const [_expandedWidget, _setExpandedWidget] = useState<WidgetId | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, import("@/components/dashboard/WidgetCard").WidgetSize>>({});
  const [pixelSizes, setPixelSizes] = useState<Record<string, {width: number;height: number;}>>(() => {
    try {
      const saved = localStorage.getItem("widget-pixel-sizes");
      return saved ? JSON.parse(saved) : {};
    } catch {return {};}
  });

  useEffect(() => {
    localStorage.setItem("widget-pixel-sizes", JSON.stringify(pixelSizes));
  }, [pixelSizes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleWidget = (id: string) => {
    setActiveWidgets((prev) =>
    prev.includes(id as WidgetId) ?
    prev.filter((w) => w !== id) :
    [...prev, id as WidgetId]
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveWidgets((prev) => {
        const oldIndex = prev.indexOf(active.id as WidgetId);
        const newIndex = prev.indexOf(over.id as WidgetId);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleExpand = (id: WidgetId) => {
    if (!isWidgetEnabled(id)) return;
    navigate(`/widget/${id}`);
  };

  return (
    <div
      className={cn(
        "p-3 md:p-8 lg:p-10 overscroll-contain",
        isMobile && "px-3 pt-2 pb-0"
      )}
    >
      {/* Notification bar - visible when there are today's events */}
      <NotificationBar />

          {/* Top bar - desktop only */}
          {!isMobile && <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-end mb-8">

            <div className="flex items-center gap-2">
              <button disabled className="rounded-xl p-2.5 opacity-50 cursor-not-allowed pointer-events-none" title="Coming soon">
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
              <button disabled className="rounded-xl p-2.5 opacity-50 cursor-not-allowed pointer-events-none" title="Coming soon">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
              {Object.keys(pixelSizes).length > 0 &&
              <button
                onClick={() => setPixelSizes({})}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground">

                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Sizes</span>
                </button>
              }
              <button disabled className="rounded-xl p-2.5 opacity-50 cursor-not-allowed pointer-events-none relative" title="Coming soon">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-destructive" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-semibold ml-1 overflow-hidden hover:bg-muted/80 transition-colors">
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="opacity-100">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground ml-1 truncate">({user?.email})</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.header>}

          {/* Widget grid - Desktop */}
          {!isMobile ?
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-4">
                  {activeWidgets.filter(id => WIDGETS[id]).map((id, i) => {
                  const widget = WIDGETS[id];
                  const Preview = widget.preview;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.04 }}
                      style={pixelSizes[id] ? { width: pixelSizes[id].width } : { width: "calc(33.333% - 11px)" }}>

                        <WidgetCard
                        id={id}
                        title={widget.title}
                        icon={widget.icon}
                        accentColor={widget.accentColor}
                        size={widgetSizes[id] || "small"}
                        tintIndex={i}
                        enabled={isWidgetEnabled(id)}
                        onExpand={() => handleExpand(id)}
                        pixelSize={pixelSizes[id] ?? { width: 300, height: 160 }}
                        onPixelResize={(size) => setPixelSizes((prev) => ({ ...prev, [id]: size }))}
                        onResetSize={() => setPixelSizes((prev) => {const next = { ...prev };delete next[id];return next;})}>

                          <Preview pixelSize={pixelSizes[id] ?? { width: 300, height: 160 }} />
                        </WidgetCard>
                      </motion.div>);

                })}
                </div>
              </SortableContext>
            </DndContext> : (

          /* Mobile: Cards with preview content */
          <div
            className="grid grid-cols-2 gap-2.5 sm:gap-3 auto-rows-fr"
            style={{
              paddingBottom: isMobile ? "calc(5.5rem + env(safe-area-inset-bottom, 0px))" : undefined,
            }}
          >
              {activeWidgets.filter(id => WIDGETS[id]).map((id, i) => {
              const widget = WIDGETS[id];
              const Preview = widget.preview;
              const isFirst = i === 0;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  onClick={() => handleExpand(id)}
                  className={cn(
                    "rounded-2xl bg-card border border-border/30 overflow-hidden transition-all duration-200 ease-out relative touch-manipulation min-w-0",
                    "shadow-sm active:scale-[0.97] active:shadow",
                    isWidgetEnabled(id)
                      ? "cursor-pointer hover:shadow-md hover:border-border/50"
                      : "cursor-not-allowed pointer-events-none opacity-90"
                  )}
                >
                    <div
                      className={cn(
                        "flex flex-col relative h-full",
                        isFirst ? "min-h-[155px] sm:min-h-[165px]" : "min-h-[135px] sm:min-h-[145px]"
                      )}
                    >
                      {!isWidgetEnabled(id) && (
                        <>
                          <div className="absolute inset-0 rounded-2xl bg-black/20 dark:bg-black/40 z-[5] pointer-events-none" aria-hidden />
                          <div className="absolute top-2 right-2 z-10 rounded-lg bg-background/95 dark:bg-background/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground border border-border/50 shadow-sm">
                            Coming soon
                          </div>
                        </>
                      )}
                      {/* Card header */}
                      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-1.5 min-h-[44px] shrink-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="opacity-90 shrink-0 flex items-center justify-center" style={{ color: "var(--brand-primary)" }}>{widget.icon}</span>
                          <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide truncate leading-tight" style={{ color: "var(--brand-primary)" }}>{widget.title}</h3>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
                      </div>
                      {/* Preview content */}
                      <div data-widget-content className="flex-1 px-3 pb-3 overflow-hidden text-foreground min-h-0 flex flex-col">
                        <Preview pixelSize={isFirst ? { width: 360, height: 110 } : { width: 170, height: 95 }} />
                      </div>
                    </div>
                  </motion.div>);

            })}
            </div>)
          }


          <WidgetCustomizer
            open={customizerOpen}
            onOpenChange={setCustomizerOpen}
            widgets={WIDGETS}
            activeWidgets={activeWidgets}
            onToggle={toggleWidget} />

    </div>);

};

export default Index;