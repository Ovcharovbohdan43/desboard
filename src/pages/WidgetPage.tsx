import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  FolderKanban, CalendarDays, Users, DollarSign, HardDrive,
  ListTodo, MessageSquare, BarChart3, Briefcase, Receipt,
} from "lucide-react";
import { ProjectsExpanded } from "@/components/dashboard/ProjectsWidget";
import { CalendarExpanded } from "@/components/dashboard/CalendarWidget";
import { ClientsExpanded } from "@/components/dashboard/ClientPortalWidget";
import { FinancesExpanded } from "@/components/dashboard/FinancesWidget";
import { FilesExpandedBackend } from "@/components/dashboard/FileStorageWidget";
import { TasksExpanded } from "@/components/dashboard/TasksWidget";
import { MessagesExpanded } from "@/components/dashboard/MessagesWidget";
import { AnalyticsExpanded } from "@/components/dashboard/AnalyticsWidget";
import { WorkspaceExpanded } from "@/components/dashboard/WorkspaceWidget";
import { InvoicesExpanded } from "@/components/dashboard/InvoicesWidget";
import { isWidgetEnabled } from "@/lib/featureFlags";

const WIDGET_MAP: Record<string, { title: string; icon: React.ReactNode; expanded: React.ComponentType }> = {
  projects: { title: "Projects", icon: <FolderKanban className="w-5 h-5" />, expanded: ProjectsExpanded },
  calendar: { title: "Calendar", icon: <CalendarDays className="w-5 h-5" />, expanded: CalendarExpanded },
  finances: { title: "Finances", icon: <DollarSign className="w-5 h-5" />, expanded: FinancesExpanded },
  clients: { title: "Client Portal", icon: <Users className="w-5 h-5" />, expanded: ClientsExpanded },
  files: { title: "File Storage", icon: <HardDrive className="w-5 h-5" />, expanded: FilesExpandedBackend },
  tasks: { title: "Tasks", icon: <ListTodo className="w-5 h-5" />, expanded: TasksExpanded },
  invoices: { title: "Invoices", icon: <Receipt className="w-5 h-5" />, expanded: InvoicesExpanded },
  messages: { title: "Messages", icon: <MessageSquare className="w-5 h-5" />, expanded: MessagesExpanded },
  analytics: { title: "Analytics", icon: <BarChart3 className="w-5 h-5" />, expanded: AnalyticsExpanded },
  workspace: { title: "Workspace", icon: <Briefcase className="w-5 h-5" />, expanded: WorkspaceExpanded },
};

const WidgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const widget = id ? WIDGET_MAP[id] : null;

  if (!widget) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Widget not found</p>
      </div>
    );
  }

  if (!isWidgetEnabled(id)) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-50 px-3 md:px-5 py-3 md:py-4 flex items-center gap-3 border-b border-border/30">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{widget.icon}</span>
            <h1 className="text-lg font-bold">{widget.title}</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-2xl bg-muted/40 p-6 flex flex-col items-center gap-3 max-w-sm text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/60" />
            <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
            <p className="text-sm text-muted-foreground">
              This feature is under development and will be available soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Expanded = widget.expanded;

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 md:px-5 py-3 md:py-4 flex items-center gap-3 border-b border-border/30">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl p-2 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{widget.icon}</span>
          <h1 className="text-lg font-bold">{widget.title}</h1>
        </div>
      </header>

      {/* Content — fixed height so chat has rigid boundaries; messages scroll inside */}
      <div className="flex-1 min-h-0 h-0 flex flex-col overflow-hidden p-3 md:p-8 lg:p-10 pb-20 md:pb-10">
        <div className="flex-1 min-h-0 h-0 min-w-0 flex flex-col overflow-hidden">
          <Expanded />
        </div>
      </div>
    </div>
  );
};

export default WidgetPage;
