import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { BrandProvider } from "@/components/BrandProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index";
import WidgetPage from "./pages/WidgetPage";
import ClientPortalPage from "./pages/ClientPortalPage";
import ClientExternalPage from "./pages/ClientExternalPage";
import InvitePage from "./pages/InvitePage";
import UnsubscribePage from "./pages/UnsubscribePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TeamProvider>
        <BrandProvider />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout><Index /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/widget/:id"
                element={
                  <ProtectedRoute>
                    <DashboardLayout><WidgetPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/:portalId"
                element={
                  <ProtectedRoute>
                    <DashboardLayout><ClientPortalPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/client/:projectId" element={<ClientExternalPage />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <DashboardLayout><SettingsPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/invite/:token" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TeamProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
