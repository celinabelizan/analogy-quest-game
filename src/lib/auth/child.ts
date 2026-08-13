import { supabase } from "@/integrations/supabase/client";

export async function ensureAnonymousChildIdentity() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error("Anonymous child session was not created");
  return data.session;
}

export async function consumeEnrollmentInvitation(secret: string, installationLabel: string) {
  if (!/^[0-9a-f]{64}$/.test(secret)) throw new Error("Invalid invitation");
  const { data, error } = await supabase.rpc("consume_enrollment_invitation", {
    p_invitation_secret: secret,
    p_installation_label: installationLabel.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function childAssignment() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("device_assignments")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
