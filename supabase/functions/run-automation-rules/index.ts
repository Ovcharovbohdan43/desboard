// Supabase Edge Function: Run automation rules
// Invoke via cron (e.g. every 5 min) or manually
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationRule {
  id: string;
  team_id: string;
  name: string;
  event_type: string;
  conditions: Record<string, unknown>;
  actions: unknown[];
  enabled: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: rules, error } = await supabase
      .from("automation_rules")
      .select("id, team_id, name, event_type, conditions, actions, enabled")
      .eq("enabled", true);

    if (error) {
      console.error("automation_rules fetch error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processed: { id: string; name: string; status: string }[] = [];

    for (const rule of (rules ?? []) as AutomationRule[]) {
      // Placeholder: evaluate conditions and execute actions
      // Extend based on event_type (e.g. project_status_changed, deliverable_completed)
      switch (rule.event_type) {
        case "project_status_changed":
        case "deliverable_completed":
        case "manual":
        default:
          // Log for now; implement actual logic per event_type
          processed.push({ id: rule.id, name: rule.name, status: "evaluated" });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: processed.length,
        rules: processed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
