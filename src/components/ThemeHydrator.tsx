import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { applyTheme, type Theme } from "@/lib/theme";

/**
 * Loads theme from user_settings (or localStorage fallback) and applies it on mount.
 * Renders nothing.
 */
export function ThemeHydrator() {
  const { user } = useAuthContext();
  const { data: settings, isSuccess } = useUserSettings();

  useEffect(() => {
    if (!user?.id) return;

    if (isSuccess) {
      const theme = (settings?.theme ?? localStorage.getItem("theme") ?? "system") as Theme;
      if (theme && ["light", "dark", "system"].includes(theme)) {
        applyTheme(theme);
      } else {
        applyTheme("system");
      }
    } else {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") {
        applyTheme(saved as Theme);
      } else {
        applyTheme("system");
      }
    }
  }, [user?.id, isSuccess, settings?.theme]);

  return null;
}
