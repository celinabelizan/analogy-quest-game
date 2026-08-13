import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2"
import { bearer, corsHeaders, json, requiredEnv } from "../_shared/http.ts"
import { sha256Hex } from "../_shared/image.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })
    const { data: userData, error } = await admin.auth.getUser(bearer(req))
    if (error || !userData.user) return json({ error: "Authentication required" }, 401)
    const form = await req.formData(), file = form.get("backup"), profileId = String(form.get("profileId") ?? ""), migrationId = String(form.get("migrationId") ?? "")
    if (!(file instanceof File) || file.type !== "application/octet-stream" || file.size < 1 || file.size > 26_214_400) return json({ error: "Invalid encrypted backup" }, 400)
    const { data: profile } = await admin.from("child_profiles").select("family_id").eq("id", profileId).maybeSingle()
    if (!profile) return json({ error: "Profile not found" }, 404)
    const { data: parent } = await admin.from("parent_memberships").select("family_id").eq("auth_user_id", userData.user.id).eq("family_id", profile.family_id).is("revoked_at", null).maybeSingle()
    if (!parent) return json({ error: "Parent membership required" }, 403)
    const { data: staged } = await admin.from("migration_sessions").select("id").eq("id", migrationId).eq("profile_id", profileId).maybeSingle()
    if (staged) return json({ error: "Backup must be uploaded before staging this migration ID" }, 409)
    const bytes = new Uint8Array(await file.arrayBuffer()), sha256 = await sha256Hex(bytes), path = `${profile.family_id}/${profileId}/${migrationId}.aesgcm`
    const { error: uploadError } = await admin.storage.from("migration-backups").upload(path, bytes, { contentType: "application/octet-stream", upsert: false })
    if (uploadError) throw uploadError
    // The database independently enforces >=30 days from its own clock. One
    // extra day prevents network/transaction latency from making that check
    // impossible to satisfy while preserving the promised minimum.
    const retainUntil = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
    const { error: markerError } = await admin.rpc("internal_register_migration_backup", { p_migration_id: migrationId, p_family_id: profile.family_id, p_profile_id: profileId, p_storage_path: path, p_ciphertext_sha256: sha256, p_retain_until: retainUntil })
    if (markerError) { await admin.storage.from("migration-backups").remove([path]); throw markerError }
    return json({ path, sha256, byteSize: bytes.byteLength, retainUntil })
  } catch { return json({ error: "Encrypted backup upload failed" }, 400) }
})
