import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { bearer, corsHeaders, json, requiredEnv } from "../_shared/http.ts";

const genericFailure = () => json({ error: "Invalid, expired, or unavailable invitation" }, 400);

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return genericFailure();
  try {
    const authorization = bearer(req);
    const admin = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userError } = await admin.auth.getUser(authorization);
    if (userError || !userData.user?.is_anonymous) return genericFailure();

    // Supabase's gateway supplies x-forwarded-for. Use the final non-empty hop,
    // not a caller-controlled leading value, and store only a secret-keyed
    // digest. Deployment must set ENROLLMENT_IP_HASH_SECRET to 32+ random bytes.
    const forwarded = req.headers.get("x-forwarded-for") ?? "";
    const trustedHop =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      forwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .at(-1);
    if (!trustedHop || trustedHop.length > 64) return genericFailure();
    const salt = requiredEnv("ENROLLMENT_IP_HASH_SECRET");
    if (salt.length < 32) throw new Error("Enrollment IP hash secret is too short");
    const ipDigest = await sha256Hex(`${salt}\0${trustedHop}`);

    // This is a separate database transaction and intentionally completes
    // before the invitation secret is checked, so failures cannot roll back
    // either the per-UID or per-IP attempt counter.
    const { data: allowed, error: limitError } = await admin.rpc(
      "internal_register_enrollment_gateway_attempt",
      { p_auth_user_id: userData.user.id, p_ip_digest: ipDigest },
    );
    if (limitError || allowed !== true) return genericFailure();

    const raw = await req.text();
    if (raw.length > 1024) return genericFailure();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return genericFailure();
    }
    const invitationSecret = typeof body.code === "string" ? body.code : "";
    const installationLabel =
      typeof body.installationLabel === "string" ? body.installationLabel : null;
    if (!/^[0-9a-f]{64}$/.test(invitationSecret) || (installationLabel?.length ?? 0) > 100)
      return genericFailure();

    const { data: assignmentResult, error: consumeError } = await admin.rpc(
      "consume_enrollment_invitation_gateway",
      {
        p_auth_user_id: userData.user.id,
        p_invitation_secret: invitationSecret,
        p_installation_label: installationLabel,
      },
    );
    const assignment = Array.isArray(assignmentResult) ? assignmentResult[0] : assignmentResult;
    if (consumeError || !assignment || typeof assignment.id !== "string") return genericFailure();
    return json({ assignment });
  } catch {
    return genericFailure();
  }
});
