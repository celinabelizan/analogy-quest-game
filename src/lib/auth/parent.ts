import { supabase } from "@/integrations/supabase/client";

export async function sendParentMagicLink(email: string, redirectTo: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error("Enter a valid email address");
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function signOutParent() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

export async function currentAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

export async function requireAal2() {
  const assurance = await currentAssuranceLevel();
  if (assurance.currentLevel !== "aal2")
    throw new Error("Verify a TOTP factor before this high-risk action");
}

export async function enrollTotp(friendlyName: string) {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
  if (error) throw error;
  return data;
}

export async function verifyTotp(factorId: string, code: string) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
  return data;
}

/** MFA recovery is ready only after two separately named verified TOTP factors. */
export async function mfaRecoveryReady() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp.filter((factor) => factor.status === "verified").length >= 2;
}
