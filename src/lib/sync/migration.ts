import { encryptBackup, sha256Hex } from "./backup";
import type { MigrationCandidate, UUID } from "./types";

const SHARED_KEY = "ssatquest.v8.shared";
const profileKey = (legacyId: string) => `ssatquest.v8.profile.${legacyId}`;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function integer(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}
function uuid() {
  return crypto.randomUUID();
}

/** Capture before any quest-store read/normalizer. Every ssatquest.* key is retained. */
export function captureRawQuestStorage(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  const raw: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("ssatquest.")) raw[key] = localStorage.getItem(key) ?? "";
  }
  return raw;
}

export async function createRawMigrationArchive(sourceInstallationId: string) {
  const capturedAt = new Date().toISOString(),
    raw = captureRawQuestStorage();
  const keys = Object.fromEntries(
    await Promise.all(
      Object.entries(raw).map(async ([key, value]) => [
        key,
        { value, sha256: await sha256Hex(value) },
      ]),
    ),
  );
  const archive = JSON.stringify({
    format: "ssatquest-phase1-raw-v1",
    sourceInstallationId,
    capturedAt,
    timezone: "America/Los_Angeles",
    minimumRetentionDays: 30,
    keys,
  });
  return { archive, raw, encrypted: await encryptBackup(archive) };
}

function localDate(when: number | string | Date) {
  const date = when instanceof Date ? when : new Date(when);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function overlapClaims(profile: JsonRecord, raw: Record<string, string>) {
  const claims: MigrationCandidate["overlappingDailyClaims"] = [],
    days = record(profile["days"]);
  const profileMarker = record(profile["familyCalendarMigration"]);
  const marker = Object.keys(profileMarker).length
    ? profileMarker
    : record(safeParse(raw["ssatquest.phase1.calendar-cutover"] ?? "{}"));
  const cutover =
    typeof marker["cutoverAt"] === "string" ? marker["cutoverAt"] : new Date().toISOString();
  const utcKey = new Date(cutover).toISOString().slice(0, 10),
    laKey = localDate(cutover);
  const overlapping = record(marker["overlappingLegacyDay"]);
  const cutoverSources =
    marker["legacyDayRebased"] === true
      ? ([
          [laKey, overlapping],
          [laKey, days[laKey]],
          [utcKey, days[utcKey]],
        ] as const)
      : ([
          [utcKey, days[utcKey]],
          [laKey, days[laKey]],
          [utcKey, overlapping],
        ] as const);
  for (const [key, source] of cutoverSources) {
    const day = record(source);
    if (!Object.keys(day).length) continue;
    if (day["exitTicket"] === true) claims.push({ familyLocalDate: key, awardKind: "exit_ticket" });
    if (day["dayBonus"] === true)
      claims.push({ familyLocalDate: key, awardKind: "analogy_day_bonus" });
    if (day["vocabBonus"] === true)
      claims.push({ familyLocalDate: key, awardKind: "vocab_day_bonus" });
  }
  return claims.filter(
    (claim, index, all) =>
      all.findIndex(
        (other) =>
          other.awardKind === claim.awardKind && other.familyLocalDate === claim.familyLocalDate,
      ) === index,
  );
}

function dailyProgressFacts(profile: JsonRecord): MigrationCandidate["dailyProgressFacts"] {
  const days = record(profile["days"]);
  const marker = record(profile["familyCalendarMigration"]);
  const merged = new Map<string, { analogyCompleted: number; vocabDone: number }>();
  const add = (familyLocalDate: string, source: unknown, combine: "max" | "sum" = "max") => {
    const day = record(source);
    const prior = merged.get(familyLocalDate) ?? { analogyCompleted: 0, vocabDone: 0 };
    merged.set(familyLocalDate, {
      analogyCompleted:
        combine === "sum"
          ? prior.analogyCompleted + integer(day["completed"])
          : Math.max(prior.analogyCompleted, integer(day["completed"])),
      vocabDone:
        combine === "sum"
          ? prior.vocabDone + integer(day["vocabDone"])
          : Math.max(prior.vocabDone, integer(day["vocabDone"])),
    });
  };
  const legacyUtcDate = String(marker["legacyUtcDate"] ?? "");
  const familyDate = String(marker["familyDate"] ?? "");
  const hasSplitCutover = legacyUtcDate !== "" && familyDate !== "" && legacyUtcDate !== familyDate;
  for (const [date, source] of Object.entries(days)) {
    if (hasSplitCutover && date === legacyUtcDate && marker["legacyDayRebased"] !== true) continue;
    add(date, source);
  }
  if (hasSplitCutover && marker["overlapMaterialized"] !== true)
    add(familyDate, marker["overlappingLegacyDay"], "sum");
  return [...merged].map(([familyLocalDate, counts]) => ({ familyLocalDate, ...counts }));
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function buildMigrationCandidateCore(
  raw: Record<string, string>,
  legacyProfileId: "bianca" | "calista" | "test",
): MigrationCandidate {
  const shared = record(safeParse(raw[SHARED_KEY] ?? "{}")),
    profile = record(safeParse(raw[profileKey(legacyProfileId)] ?? "{}"));
  const rewardsRoot = record(shared["rewards"]),
    legacyRewards = array(rewardsRoot[legacyProfileId]).map(record);
  const rewards: MigrationCandidate["rewards"] = legacyRewards.map((reward) => ({
    legacyId: String(reward["id"] ?? uuid()),
    cloudRewardId: uuid(),
    cloudRevisionId: uuid(),
    name: String(reward["name"] ?? "Untitled reward"),
    xp: Math.max(1, integer(reward["xp"], 1)),
    ...(typeof reward["photo"] === "string" && reward["photo"]
      ? { legacyPhotoQuarantined: reward["photo"] }
      : {}),
  }));
  const history = array(profile["history"]).map(record),
    mastery = Object.values(record(profile["wordMastery"])).map(record),
    days = record(profile["days"]);
  const latestByQuestion = new Map<string, number>();
  let completionOrdinal = 0;
  history.forEach((attempt) => {
    if (attempt["skipped"] === true || typeof attempt["qid"] !== "string") return;
    completionOrdinal += 1;
    latestByQuestion.set(attempt["qid"], completionOrdinal);
  });
  const redemptions: MigrationCandidate["redemptions"] = array(profile["redemptions"])
    .map(record)
    .map((item) => ({
      cloudRedemptionId: uuid(),
      rewardId: String(item["rewardId"] ?? ""),
      name: String(item["name"] ?? "Imported reward"),
      cost: Math.max(1, integer(item["cost"], 1)),
      status:
        item["status"] === "approved"
          ? "approved"
          : item["status"] === "declined"
            ? "declined"
            : "pending",
      requestedAt:
        typeof item["requestedAt"] === "string" ? item["requestedAt"] : new Date().toISOString(),
      ...(typeof item["resolvedAt"] === "string" ? { resolvedAt: item["resolvedAt"] } : {}),
    }));
  const knownLegacyIds = new Set(rewards.map((reward) => reward.legacyId));
  const activeRewardId =
    typeof profile["activeRewardId"] === "string" ? profile["activeRewardId"] : null;
  const orphanIds = new Set(redemptions.map((item) => item.rewardId).filter(Boolean));
  if (activeRewardId) orphanIds.add(activeRewardId);
  for (const legacyId of orphanIds) {
    if (knownLegacyIds.has(legacyId)) continue;
    const history = redemptions.find((item) => item.rewardId === legacyId);
    rewards.push({
      legacyId,
      cloudRewardId: uuid(),
      cloudRevisionId: uuid(),
      name: history?.name ?? "Imported reward",
      xp: history?.cost ?? 1,
      ...(legacyId !== activeRewardId ? { archivedImported: true } : {}),
    });
    knownLegacyIds.add(legacyId);
  }
  return {
    lifetimeXp: integer(profile["lifetimeXp"]),
    availableXp: integer(profile["availableXp"]),
    rewards,
    activeRewardId,
    redemptions,
    showRewards: shared["showRewards"] === true,
    xpFacts: {
      completedAnalogyCount: integer(
        profile["completedCount"],
        history.filter((item) => item["skipped"] !== true).length,
      ),
      correctAnalogyCount: history.filter(
        (item) => item["skipped"] !== true && item["correct"] === true,
      ).length,
      correctStreak: integer(profile["streak"]),
      vocabAnswerCount: Object.values(days).reduce<number>(
        (sum, value) => sum + integer(record(value)["vocabDone"]),
        0,
      ),
      analogyLastCompleted: [...latestByQuestion].map(([contentId, completedOrdinal]) => ({
        contentId,
        completedOrdinal,
      })),
    },
    vocabBonusFacts: mastery
      .filter((item) => typeof item["vocabId"] === "string")
      .map((item) => ({
        vocabId: String(item["vocabId"]),
        correctContextCount: integer(item["contextScore"]),
        masteryBonusAwarded: item["masteredBonusAwarded"] === true,
      })),
    dailyProgressFacts: dailyProgressFacts(profile),
    overlappingDailyClaims: overlapClaims(profile, raw),
    localLearningSummary: {
      analogyHistoryCount: history.length,
      analogyCompletedCount: integer(profile["completedCount"]),
      hasCurrentDrill: profile["current"] != null,
      vocabularyWordCount: mastery.length,
      vocabularyMasteredCount: mastery.filter((item) => item["masteredBonusAwarded"] === true)
        .length,
      dailyRecordCount: Object.keys(days).length,
    },
  };
}

export async function migrationHashes(raw: Record<string, string>, legacyProfileId: string) {
  return {
    sharedSha256: await sha256Hex(raw[SHARED_KEY] ?? ""),
    profileSha256: await sha256Hex(raw[profileKey(legacyProfileId)] ?? ""),
  };
}

export type StagedMigration = {
  migrationId: UUID;
  idempotencyKey: UUID;
  candidate: MigrationCandidate;
};

export type RawV8Backup = { capturedAt: string; values: Record<string, string> };
export function captureRawV8Backup(storage: Storage): RawV8Backup {
  const values: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("ssatquest.")) values[key] = storage.getItem(key) ?? "";
  }
  return { capturedAt: new Date().toISOString(), values };
}

export function buildMigrationCandidate(
  backup: RawV8Backup,
  options: { profileSlug: "bianca" | "calista" | "test"; migrationId: string },
): MigrationCandidate & { migrationId: string; migrationCredit: number };
export function buildMigrationCandidate(
  raw: Record<string, string>,
  profile: "bianca" | "calista" | "test",
): MigrationCandidate;
export function buildMigrationCandidate(
  first: RawV8Backup | Record<string, string>,
  second:
    | { profileSlug: "bianca" | "calista" | "test"; migrationId: string }
    | "bianca"
    | "calista"
    | "test",
) {
  const backup = "values" in first ? (first as RawV8Backup) : null,
    slug = typeof second === "string" ? second : second.profileSlug;
  const candidate = buildMigrationCandidateCore(
    backup?.values ?? (first as Record<string, string>),
    slug,
  );
  return backup && typeof second !== "string"
    ? { ...candidate, migrationId: second.migrationId, migrationCredit: candidate.lifetimeXp }
    : candidate;
}

export function reconcilePhase1(local: Record<string, unknown>, cloud: Record<string, unknown>) {
  const localRevision = Number(local["cloudRevision"] ?? 0),
    cloudRevision = Number(cloud["revision"] ?? 0);
  if (localRevision > cloudRevision) {
    const acknowledged = local["acknowledged"] as Record<string, number>,
      optimisticDelta = Number(local["optimisticDelta"] ?? 0);
    return {
      ...local,
      cloudRevision: localRevision,
      acknowledged,
      optimisticDelta,
      visible: {
        availableXp: Number(acknowledged["availableXp"] ?? 0) + optimisticDelta,
        lifetimeXp: Number(acknowledged["lifetimeXp"] ?? 0) + optimisticDelta,
      },
      ignoredCloudRevision: cloudRevision,
      cloudAuthoritative: acknowledged,
      conflicts: [],
    };
  }
  const cloudAuthoritative = {
    availableXp: Number(cloud["availableXp"] ?? 0),
    lifetimeXp: Number(cloud["lifetimeXp"] ?? 0),
  };
  return {
    ...local,
    cloudRevision,
    acknowledged: cloudAuthoritative,
    cloudAuthoritative,
    visible: {
      availableXp: cloudAuthoritative.availableXp + Number(local["optimisticDelta"] ?? 0),
      lifetimeXp: cloudAuthoritative.lifetimeXp + Number(local["optimisticDelta"] ?? 0),
    },
    conflicts: [],
  };
}
