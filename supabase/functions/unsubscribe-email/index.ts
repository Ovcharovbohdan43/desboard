// Supabase Edge Function: Unsubscribe from team invite emails
// Called from public /unsubscribe page. verify_jwt = false
// Query params: i=inviteId, e=base64url(email), s=base64url(hmac)
// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  try {
    const binary = atob(b64 + "=".repeat(pad));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const i = url.searchParams.get("i");
    const e = url.searchParams.get("e");
    const s = url.searchParams.get("s");

    if (!i || !e || !s) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = Deno.env.get("UNSUBSCRIBE_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unsubscribe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = base64UrlDecode(e);
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = `${i}|${email}`;
    const expectedSig = await hmacSha256Base64(secret, payload);

    function b64urlToBytes(str: string): Uint8Array {
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const pad = (4 - (b64.length % 4)) % 4;
      const binary = atob(b64 + "=".repeat(pad));
      return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    }
    const sigBytes = b64urlToBytes(s);
    const expectedBytes = b64urlToBytes(expectedSig);
    if (sigBytes.length !== expectedBytes.length || !sigBytes.every((b, idx) => b === expectedBytes[idx])) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("email_unsubscribes")
      .upsert(
        { email: email.toLowerCase().trim(), type: "team_invites" },
        { onConflict: "email,type", doNothing: true }
      );

    if (error) {
      console.error("unsubscribe insert error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to unsubscribe" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("unsubscribe-email error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
