import type { LocalProfileId, Phase1Snapshot } from "./model";

export type ChildProfileAccess =
  | { allowed: true; mode: "local_fallback" | "parent" | "assigned_child" }
  | {
      allowed: false;
      reason:
        | "wrong_profile"
        | "unpaired"
        | "revoked"
        | "recovery_required"
        | "migration_cutover"
        | "loading";
      assignedProfileId?: LocalProfileId;
    };

/**
 * Pure and deliberately fail-closed. Call this before any useProfile(profileId) hook so a denied
 * route cannot even hydrate another child's localStorage key.
 */
export function childProfileAccess(
  snapshot: Phase1Snapshot,
  requestedProfileId: LocalProfileId,
): ChildProfileAccess {
  if (!snapshot.adapterAvailable) return { allowed: true, mode: "local_fallback" };

  const parentSignedIn =
    snapshot.parent.state === "authenticated" || snapshot.parent.state === "reauth_required";
  if (parentSignedIn) return { allowed: true, mode: "parent" };

  if (snapshot.migrationCutoverLocked)
    return {
      allowed: false,
      reason: "migration_cutover",
      ...(snapshot.activeChild?.localProfileId
        ? { assignedProfileId: snapshot.activeChild.localProfileId }
        : {}),
    };

  if (snapshot.activeChild?.localProfileId) {
    if (snapshot.activeChild.localProfileId === requestedProfileId) {
      return { allowed: true, mode: "assigned_child" };
    }
    return {
      allowed: false,
      reason: "wrong_profile",
      assignedProfileId: snapshot.activeChild.localProfileId,
    };
  }

  if (snapshot.connection === "revoked") return { allowed: false, reason: "revoked" };
  if (snapshot.connection === "recovery_required") {
    return { allowed: false, reason: "recovery_required" };
  }
  if (snapshot.connection === "unpaired") return { allowed: false, reason: "unpaired" };
  return { allowed: false, reason: "loading" };
}

export function visibleChildProfiles(
  snapshot: Phase1Snapshot,
  candidates: readonly LocalProfileId[],
): LocalProfileId[] {
  if (!snapshot.adapterAvailable) return [...candidates];
  const parentSignedIn =
    snapshot.parent.state === "authenticated" || snapshot.parent.state === "reauth_required";
  if (parentSignedIn) return [...candidates];
  const assigned = snapshot.activeChild?.localProfileId;
  return assigned && candidates.includes(assigned) ? [assigned] : [];
}
