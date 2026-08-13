import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2"
import { bearer, corsHeaders, json, requiredEnv } from "../_shared/http.ts"
import { inspectImage, sha256Hex } from "../_shared/image.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  try {
    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await admin.auth.getUser(bearer(req))
    if (userError || !userData.user) return json({ error: "Authentication required" }, 401)
    const form = await req.formData()
    const file = form.get("file"), rewardId = String(form.get("rewardId") ?? ""), profileId = String(form.get("profileId") ?? "")
    if (!(file instanceof File) || !/^[0-9a-f-]{36}$/.test(rewardId) || !/^[0-9a-f-]{36}$/.test(profileId)) return json({ error: "Invalid upload request" }, 400)
    if (file.size < 1 || file.size > 5_242_880) return json({ error: "Image must be 5 MB or smaller" }, 400)
    const [{ data: assignment }, { data: profile }] = await Promise.all([
      admin.from("device_assignments").select("profile_id").eq("auth_user_id", userData.user.id).eq("status", "active").maybeSingle(),
      admin.from("child_profiles").select("id,family_id").eq("id", profileId).maybeSingle(),
    ])
    if (!profile) return json({ error: "Profile not found" }, 404)
    const { data: membership } = await admin.from("parent_memberships").select("family_id").eq("auth_user_id", userData.user.id).eq("family_id", profile.family_id).is("revoked_at", null).maybeSingle()
    if ((!assignment || assignment.profile_id !== profileId) && !membership) return json({ error: "Not allowed" }, 403)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dailyUploads } = await admin.from("reward_image_assets").select("id", { count: "exact", head: true }).eq("created_by", userData.user.id).gte("created_at", since)
    if ((dailyUploads ?? 0) >= 10) return json({ error: "Daily image upload limit reached" }, 429)
    const { data: reward } = await admin.from("reward_items").select("id,profile_id,family_id").eq("id", rewardId).eq("profile_id", profileId).maybeSingle()
    if (!reward) return json({ error: "Create the text proposal before attaching its photo" }, 409)
    const bytes = new Uint8Array(await file.arrayBuffer()), image = inspectImage(bytes, file.type), sha256 = await sha256Hex(bytes), assetId = crypto.randomUUID()
    const extension = image.mime === "image/jpeg" ? "jpg" : image.mime === "image/png" ? "png" : "webp"
    const path = `${reward.family_id}/${profileId}/${rewardId}/${assetId}.${extension}`
    const { error: uploadError } = await admin.storage.from("reward-images").upload(path, bytes, { contentType: image.mime, upsert: false, cacheControl: "3600" })
    if (uploadError) throw uploadError
    const { error: assetError } = await admin.from("reward_image_assets").insert({ id: assetId, family_id: reward.family_id, profile_id: profileId, reward_id: rewardId, storage_path: path, mime_type: image.mime, byte_size: bytes.byteLength, width: image.width, height: image.height, sha256, created_by: userData.user.id, finalized_at: new Date().toISOString() })
    if (assetError) { await admin.storage.from("reward-images").remove([path]); throw assetError }
    return json({ assetId, mimeType: image.mime, width: image.width, height: image.height, sha256 })
  } catch { return json({ error: "Image upload failed validation or authorization" }, 400) }
})
