import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/page-loader";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageLoader message="Loading…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
