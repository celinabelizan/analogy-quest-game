export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  })
}

export function bearer(req: Request): string {
  const value = req.headers.get("authorization") ?? ""
  if (!value.startsWith("Bearer ") || value.length < 20) throw new Error("Authentication required")
  return value.slice(7)
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Server configuration missing: ${name}`)
  return value
}
