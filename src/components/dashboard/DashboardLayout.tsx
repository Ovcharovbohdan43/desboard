import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/dashboard/Sidebar";
import { TeamGuard } from "@/components/TeamGuard";
import { ThemeHydrator } from "@/components/ThemeHydrator";
import { BrandProvider } from "@/components/BrandProvider";

const navToRoute: Record<string, string> = {
  home: "/",
  projects: "/widget/projects",
  calendar: "/widget/calendar",
  clients: "/widget/clients",
  finances: "/widget/finances",
  invoices: "/widget/invoices",
  files: "/widget/files",
  tasks: "/widget/tasks",
  messages: "/widget/messages",
  analytics: "/widget/analytics",
  workspace: "/widget/workspace",
  settings: "/settings",
};

const routeToNav = (pathname: string): string => {
  if (pathname === "/") return "home";
  if (pathname === "/settings") return "settings";
  const match = pathname.match(/^\/widget\/(.+)$/);
  if (match && match[1]) return match[1];
  return "home";
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeNav = routeToNav(location.pathname);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
    else if (saved === "light") document.documentElement.classList.remove("dark");
    else if (!saved || saved === "system") {
      document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const handleNavChange = (id: string) => {
    const route = navToRoute[id];
    if (route) navigate(route);
  };

  return (
    <>
      <ThemeHydrator />
      <div className="min-h-screen bg-background p-0 md:p-5 lg:p-6">
        <div className="dashboard-container h-screen md:h-[calc(100vh-3rem)] flex overflow-hidden">
          <Sidebar
            activeNav={activeNav}
            onNavChange={handleNavChange}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
          <main className="flex-1 min-w-0 min-h-0 flex flex-col">
            <TeamGuard>{children}</TeamGuard>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
