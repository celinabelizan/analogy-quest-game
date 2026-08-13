import { enqueueXpEvidence } from "./outbox";
import type { EvidenceKind } from "./types";
import { bindAttemptToken } from "./indexed-db";
const AUTHORITY_KEY = "ssatquest.phase1.cloud-authority";
const ROLLBACK_LOCK_KEY = "ssatquest.phase1.rollback-in-progress";

export async function recordXpEvidence(input: {
  attemptId: string;
  evidenceKind: EvidenceKind;
  contentId: string;
  localProfileId: "bianca" | "calista" | "test";
  payload: Record<string, unknown>;
  occurredAt?: string;
  offlineAuthorization?: string;
}) {
  const token = input.offlineAuthorization
    ? undefined
    : await bindAttemptToken(input.attemptId, input.contentId);
  const record = await enqueueXpEvidence({
    kind: "xp_evidence",
    eventId: crypto.randomUUID(),
    attemptId: input.attemptId,
    evidenceKind: input.evidenceKind,
    contentId: input.contentId,
    contentVersion: 1,
    ruleVersion: 1,
    payload: input.payload,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...(input.offlineAuthorization
      ? { offlineAuthorization: input.offlineAuthorization }
      : token
        ? { offlineAuthorization: token.secret }
        : {}),
  });
  if (typeof window !== "undefined" && navigator.onLine) {
    window.dispatchEvent(new Event("ssatquest:outbox"));
  }
  return record;
}

/**
 * Route-safe dual-write hook. Local learning/XP remains immediate; evidence is
 * queued only for the exact enrolled profile after confirmed migration cutover.
 * Pre-confirm practice remains in the raw/local reconciliation source and never
 * acquires a sequence under a future identity.
 */
export async function recordXpEvidenceIfActive(input: Parameters<typeof recordXpEvidence>[0]) {
  if (typeof localStorage === "undefined") return { queued: false as const, reason: "server" };
  if (localStorage.getItem(ROLLBACK_LOCK_KEY))
    return { queued: false as const, reason: "rollback-local-only" };
  let marker: {
    profileId?: string;
    localProfileId?: "bianca" | "calista" | "test";
    migrationId?: string;
    confirmedAt?: string;
  } = {};
  try {
    marker = JSON.parse(localStorage.getItem(AUTHORITY_KEY) ?? "{}") as typeof marker;
  } catch {
    /* local-only */
  }
  if (!marker.profileId || !marker.localProfileId || !marker.migrationId || !marker.confirmedAt)
    return { queued: false as const, reason: "local-only" };
  if (marker.localProfileId !== input.localProfileId)
    return { queued: false as const, reason: "wrong-profile" };
  return { queued: true as const, record: await recordXpEvidence(input) };
}

export function markCloudAuthoritative(
  profileId: string,
  localProfileId: "bianca" | "calista" | "test",
  migrationId: string,
  confirmedAt: string,
) {
  localStorage.setItem(
    AUTHORITY_KEY,
    JSON.stringify({ profileId, localProfileId, migrationId, confirmedAt }),
  );
}

export function returnToLocalOnly() {
  localStorage.removeItem(AUTHORITY_KEY);
}
