import { useEffect } from "react";
import { useTeamContext } from "@/contexts/TeamContext";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { hexToHsl } from "@/lib/colorUtils";

const DEFAULT_PRIMARY = "#6366f1";
const VARS = ["--brand-primary", "--primary", "--primary-foreground", "--ring", "--sidebar-primary", "--sidebar-ring"] as const;

/**
 * Injects team branding (primary_color) into CSS variables.
 * - --brand-primary: raw hex for arbitrary values (bg-[var(--brand-primary)])
 * - --primary, --ring, --sidebar-primary: HSL format for Tailwind (tabs, progress, sidebar)
 */
export function BrandProvider({ children }: { children?: React.ReactNode }) {
  const { teamId } = useTeamContext();
  const { data: teamSettings } = useTeamSettings(teamId);

  useEffect(() => {
    const hex = teamSettings?.primary_color ?? DEFAULT_PRIMARY;
    const hsl = hexToHsl(hex);
    const fg = "0 0% 100%";

    document.documentElement.style.setProperty("--brand-primary", hex);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--primary-foreground", fg);
    document.documentElement.style.setProperty("--ring", hsl);
    document.documentElement.style.setProperty("--sidebar-primary", hsl);
    document.documentElement.style.setProperty("--sidebar-ring", hsl);

    return () => {
      VARS.forEach((v) => document.documentElement.style.removeProperty(v));
    };
  }, [teamId, teamSettings?.primary_color]);

  return <>{children ?? null}</>;
}
