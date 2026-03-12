// Supabase Edge Function: Send team invite email via Resend
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Body: { inviteId: string, appUrl: string }
  // @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRow {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
}

interface ProfileRow {
  display_name: string | null;
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function buildEmailHtml(params: {
  teamName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
  unsubscribeLink?: string;
}) {
  const { teamName, inviterName, role, inviteLink, expiresIn, unsubscribeLink } = params;
  const roleLabel = role === "admin" ? "Admin" : role === "member" ? "Member" : "Guest";
  const footer = unsubscribeLink
    ? `<p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa;"><a href="${unsubscribeLink}" style="color: #71717a;">Unsubscribe from team invite emails</a></p>`
    : "";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to ${teamName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <tr>
      <td style="background: #fff; border-radius: 12px; padding: 32px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">You're invited to join ${teamName}</h1>
        <p style="margin: 0 0 24px; font-size: 15px; color: #71717a;">${inviterName} has invited you to join the team as <strong>${roleLabel}</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td>
              <a href="${inviteLink}" style="display: inline-block; background: #18181b; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">Accept invitation</a>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa;">This invitation expires in ${expiresIn}. If you weren't expecting this invite, you can safely ignore this email.</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa;">
          <a href="${inviteLink}" style="color: #71717a; word-break: break-all;">${inviteLink}</a>
        </p>
        ${footer}
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { inviteId?: string; appUrl?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inviteId, appUrl } = body;
    if (!inviteId || !appUrl || typeof inviteId !== "string" || typeof appUrl !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "inviteId and appUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "SUPABASE_ANON_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: invite, error: inviteErr } = await supabase
      .from("team_invites")
      .select("id, team_id, email, role, token, invited_by, expires_at")
      .eq("id", inviteId)
      .single();

    if (inviteErr || !invite) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invite not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inv = invite as InviteRow & { expires_at: string };
    const expiresAt = new Date(inv.expires_at);
    const now = new Date();
    if (expiresAt <= now) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invite expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isInviter = user.id === inv.invited_by;
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", inv.team_id)
      .eq("user_id", user.id)
      .single();
    const isAdmin = ["owner", "admin"].includes((membership as { role?: string } | null)?.role ?? "");
    const { data: teamRow } = await supabase
      .from("teams")
      .select("name, created_by")
      .eq("id", inv.team_id)
      .single();
    const teamData = teamRow as { name?: string; created_by?: string } | null;
    const isCreator = teamData?.created_by === user.id;
    if (!isInviter && !isCreator && !isAdmin) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not authorized to send this invite" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamName = teamData?.name ?? "the team";

    const { data: unsub } = await supabase
      .from("email_unsubscribes")
      .select("id")
      .eq("email", inv.email.toLowerCase().trim())
      .eq("type", "team_invites")
      .maybeSingle();
    if (unsub) {
      return new Response(
        JSON.stringify({ ok: false, error: "This email has unsubscribed from team invite emails" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", inv.invited_by)
      .single();
    const inviterName = (profile as ProfileRow | null)?.display_name ?? "A teammate";

    const inviteLink = `${appUrl.replace(/\/$/, "")}/invite/${inv.token}`;
    const expiresIn = "7 days";

    let unsubscribeLink: string | undefined;
    const unsubSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (unsubSecret) {
      const e = base64UrlEncode(inv.email);
      const payload = `${inv.id}|${inv.email}`;
      const s = await hmacSha256Base64(unsubSecret, payload);
      unsubscribeLink = `${appUrl.replace(/\/$/, "")}/unsubscribe?i=${encodeURIComponent(inv.id)}&e=${encodeURIComponent(e)}&s=${encodeURIComponent(s)}`;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Desboard <invites@desboard.app>",
        to: [inv.email],
        subject: `You're invited to join ${teamName}`,
        html: buildEmailHtml({
          teamName,
          inviterName,
          role: inv.role,
          inviteLink,
          expiresIn,
          unsubscribeLink,
        }),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: (data as { message?: string })?.message ?? "Failed to send email",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, emailId: (data as { id?: string })?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-invite-email error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
