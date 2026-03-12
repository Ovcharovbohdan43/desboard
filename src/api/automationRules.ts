import { supabase } from "@/integrations/supabase/client";

export interface AutomationRule {
  id: string;
  team_id: string;
  name: string;
  event_type: string;
  conditions: Record<string, unknown>;
  actions: unknown[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchAutomationRules(teamId: string): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AutomationRule[];
}
