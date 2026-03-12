import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO date string as relative time (e.g. "2h ago", "3d ago"). */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = 60 * 1000;
  const h = 60 * min;
  const day = 24 * h;
  if (diff < min) return "now";
  if (diff < h) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / h)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format bytes to human-readable size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
