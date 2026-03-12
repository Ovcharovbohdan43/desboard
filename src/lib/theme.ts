export type Theme = "light" | "dark" | "system";

export function applyTheme(theme: Theme): void {
  let resolved: "light" | "dark" = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  localStorage.setItem("theme", theme);
}

export function getResolvedTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
