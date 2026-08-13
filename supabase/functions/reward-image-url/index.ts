import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2"
import { bearer, corsHeaders, json, requiredEnv } from "../_shared/http.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })
    const { data: userData, error } = await admin.auth.getUser(bearer(req))
    if (error || !userData.user) return json({ error: "Authentication required" }, 401)
    const { assetId } = await req.json()
    const { data: asset } = await admin.from("reward_image_assets").select("storage_path,profile_id,family_id").eq("id", assetId).maybeSingle()
    if (!asset) return json({ error: "Image not found" }, 404)
    const [{ data: child }, { data: parent }] = await Promise.all([
      admin.from("device_assignments").select("id").eq("auth_user_id", userData.user.id).eq("profile_id", asset.profile_id).eq("status", "active").maybeSingle(),
      admin.from("parent_memberships").select("family_id").eq("auth_user_id", userData.user.id).eq("family_id", asset.family_id).is("revoked_at", null).maybeSingle(),
    ])
    if (!child && !parent) return json({ error: "Not allowed" }, 403)
    const { data, error: signError } = await admin.storage.from("reward-images").createSignedUrl(asset.storage_path, 300)
    if (signError) throw signError
    return json({ signedUrl: data.signedUrl, expiresIn: 300 })
  } catch { return json({ error: "Image URL request failed" }, 400) }
})
