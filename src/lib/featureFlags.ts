/**
 * Backend-ready features. Disabled items are dimmed and non-clickable.
 * Enable as backend integration is completed:
 * - Add widget id to ENABLED_WIDGETS for dashboard cards and WidgetPage
 * - Add nav id to ENABLED_NAV_IDS for Sidebar items
 */
export const ENABLED_WIDGETS = new Set<string>([
  "projects",
  "workspace",
  "tasks",
  "files",
  "clients",
  "messages",
]);

export const ENABLED_NAV_IDS = new Set<string>([
  "home",
  "projects",
  "workspace",
  "tasks",
  "files",
  "clients",
  "messages",
  "settings",
]);

export function isWidgetEnabled(id: string): boolean {
  return ENABLED_WIDGETS.has(id);
}

export function isNavEnabled(id: string): boolean {
  if (id === "home") return true;
  return ENABLED_NAV_IDS.has(id);
}
