import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  className?: string;
}

/** Full-page loading indicator — spinner + optional message */
export function PageLoader({ message = "Loading…", className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 min-h-[200px]",
        className
      )}
      role="status"
      aria-label={message}
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

/** Compact inline loader for sections */
export function SectionLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 py-6 justify-center", className)} role="status">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}
