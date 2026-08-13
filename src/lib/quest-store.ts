import { useCallback, useEffect, useState } from "react";
import { REWARDS_BY_GIRL } from "@/data/questions";

export type ProfileId = "bianca" | "calista" | "test";

export const PROFILES: { id: ProfileId; name: string; age: number; accent: string }[] = [
  { id: "bianca", name: "Bianca", age: 12, accent: "#FF2E93" },
  { id: "calista", name: "Calista", age: 10, accent: "#00C4B4" },
];

/** Test profile — a sandbox for the parent to try the app without touching the
 *  girls' real data. Excluded from PROFILES so it never shows on the kid switcher;
 *  reachable only via the parent panel's "Test drive" link. */
export const TEST_PROFILE = { id: "test" as ProfileId, name: "Test", age: 0, accent: "#8A8398" };

/** All profiles including test, for reward seeding / iteration where needed. */
export const ALL_PROFILE_IDS: ProfileId[] = ["bianca", "calista", "test"];

export type Reward = { id: string; name: string; xp: number; photo?: string };
export type Redemption = {
  id: string;
  rewardId: string;
  name: string;
  cost: number;
  status: "pending" | "approved" | "declined";
  requestedAt: string;
  resolvedAt?: string;
  celebrated?: boolean;
};

export type Judgment = "works" | "kind" | "no";

export type Drill = {
  qid: string;
  /** Stable replay identity for all Phase-1 XP evidence from this local attempt. */
  syncAttemptId?: string;
  phase: "type" | "stem" | "monkey" | "verdict" | "final" | "feedback";
  familyGuess: string | null;
  awardedType: boolean;
  bridge: string;
  locked: boolean;
  monkeyIndex: number;
  judgments: Record<string, Judgment>;
  awardedBridge: boolean;
  awardedJudged: string[];
  awardedFinal: boolean;
  finalChoice: string | null;
  blank: boolean;
  correct: boolean | null;
  ackCorrection: boolean;
  verdict: null | "clean" | "rewrite" | "loose";
  xpMode: "full" | "repeat" | "none";
  startedAt: number;
  /** How many times she has gone back to rewrite the sentence. */
  rewrites?: number;
  /** She said she didn't know one of the stem words. */
  stuckOnWord?: boolean;
  /** She peeked at a model sentence. */
  peeked?: boolean;
  /** She opened the live coach during discard. */
  coachUsed?: boolean;
  /** How many coach tips she read. */
  coachSteps?: number;
  /** Which coach tips she read, by title. */
  coachTips?: string[];
  /** True once this drill has been counted toward today's question total (guards double-count). */
  dayCounted?: boolean;
};

export type ProfileState = {
  /** One-time local data migrations already applied on this device. */
  dataVersion?: number;
  lifetimeXp: number;
  availableXp: number;
  streak: number;
  activeRewardId: string | null;
  redemptions: Redemption[];
  seenAt: Record<string, number>;
  completedCount: number;
  recent: string[];
  days: Record<
    string,
    {
      completed: number;
      exitTicket: boolean;
      dayBonus: boolean;
      vocabDone?: number;
      vocabBonus?: boolean;
    }
  >;
  current: Drill | null;
  /** One entry per finished question, newest last. */
  history?: Attempt[];
  /** Vocab words missed and not yet redeemed: word-item id -> consecutive corrects needed info. */
  tricky?: Record<string, { misses: number; streak: number; addedAt: number }>;
  /** Per-vocab-item stats: last seen + total corrects (drives rotation). */
  vocabSeen?: Record<string, { at: number; corrects: number }>;
  /** Versioned migration from the original tricky/vocabSeen Word Lab data. */
  vocabMigrationVersion?: number;
  /** Per-word learning state. Content remains separate in vocab-system.ts. */
  wordMastery?: Record<string, WordMastery>;
  /** Separate LA-calendar cutover. The existing XP/Vocabulary migrations remain unchanged. */
  familyCalendarMigration?: {
    version: 1;
    cutoverAt: string;
    legacyUtcDate: string;
    familyDate: string;
    overlappingLegacyDay?: ProfileState["days"][string];
    legacyDayRebased?: boolean;
    overlapMaterialized?: boolean;
  };
};

export type WordMastery = {
  vocabId: string;
  masteryStage: 0 | 1 | 2 | 3 | 4 | 5;
  correctStreak: number;
  incorrectCount: number;
  lastSeen: string;
  nextReview: string;
  definitionScore: number;
  synonymScore: number;
  antonymScore: number;
  contextScore: number;
  distinctionScore: number;
  recallScore: number;
  masteredBonusAwarded?: boolean;
};

/** What tripped her up on a question. */
export type Struggle = "vocab" | "order" | "sentence" | "category" | "none";

export const STRUGGLE_LABEL: Record<Struggle, string> = {
  vocab: "Vocabulary",
  order: "Direction / order",
  sentence: "Bridge sentence",
  category: "Bridge type",
  none: "Solo solve",
};

/** A finished question, kept so a parent can see what happened. */
export type Attempt = {
  qid: string;
  at: number;
  stem: string;
  family: string;
  familyGuess: string | null;
  familyRight: boolean;
  choice: string | null;
  correctChoice: string;
  correct: boolean;
  rewrites: number;
  peeked: boolean;
  stuckOnWord: boolean;
  /** True when she tapped Skip instead of answering — never counts as answered. */
  skipped?: boolean;
  /** She opened the live coach on this question. */
  coachUsed?: boolean;
  /** Number of coach tips read. */
  coachSteps?: number;
  /** Coach tips read, by title. */
  coachTips?: string[];
  /** The pair she picked was the right relationship, backwards. */
  orderTrap?: boolean;
  /** Best guess at what made this one hard. */
  struggle?: Struggle;
};

/** Rank the signals so one question reports one clear sticking point. */
export function classifyStruggle(a: {
  correct: boolean;
  skipped?: boolean;
  peeked?: boolean;
  stuckOnWord?: boolean;
  orderTrap?: boolean;
  rewrites?: number;
  coachUsed?: boolean;
  familyRight?: boolean;
}): Struggle {
  if (a.stuckOnWord || a.peeked) return "vocab";
  if (a.orderTrap) return "order";
  if ((a.rewrites ?? 0) > 0 || a.coachUsed) return "sentence";
  if (!a.familyRight && (!a.correct || a.skipped)) return "category";
  if (!a.correct || a.skipped) return "sentence";
  return "none";
}

/** Each girl has her own private wishlist. enabledGroups gates which Foundation-Six
 *  bridge families appear in practice (parent controls "do what I just taught").
 *  Undefined = all six on (backward compatible with older saves).
 *  classMode: when set, practice draws ONLY that difficulty (1|2|3) — the parent's
 *  live teaching control ("I just taught this; drill easy ones now"). Undefined = all
 *  levels, excluding tooEasy teaching examples. */
export type SharedState = {
  pin: string;
  rewards: Partial<Record<ProfileId, Reward[]>>;
  enabledGroups?: string[];
  classDifficulty?: 1 | 2 | 3 | undefined;
  /** When true, the girls see the reward ring / wishlist / redemption UI in their
   *  dashboard + landing cards. Default OFF so rewards don't become a distraction
   *  (kids fixating on shopping / trying to edit the list). Parent flips it on when
   *  the reward list is ready to show. */
  showRewards?: boolean;
};

const SHARED_KEY = "ssatquest.v8.shared";
const MIGRATION_CUTOVER_LOCK_KEY = "ssatquest.phase1.migration-cutover-lock";
let migrationMaterializationBypass = false;
const profileKey = (id: ProfileId) => `ssatquest.v8.profile.${id}`;
const PROFILE_DATA_VERSION = 1;
const VOCAB_MIGRATION_VERSION = 1;
const WELCOME_XP = 200;

const emptyProfile = (): ProfileState => ({
  lifetimeXp: 0,
  availableXp: 0,
  streak: 0,
  activeRewardId: null,
  redemptions: [],
  seenAt: {},
  completedCount: 0,
  recent: [],
  days: {},
  current: null,
});

/**
 * One-time fresh start for the girls: keep reward choices and their redemption
 * ledger, but clear practice state and give each girl a visible starting bank.
 * The version flag makes this safe on every iPad without re-running later.
 */
function normalizeProfile(id: ProfileId, profile: ProfileState): ProfileState {
  let next = profile;
  if (id !== "test" && profile.dataVersion !== PROFILE_DATA_VERSION) {
    next = {
      ...emptyProfile(),
      dataVersion: PROFILE_DATA_VERSION,
      lifetimeXp: WELCOME_XP,
      availableXp: WELCOME_XP,
      activeRewardId: profile.activeRewardId ?? null,
      redemptions: profile.redemptions ?? [],
    };
  }
  if (next.vocabMigrationVersion === VOCAB_MIGRATION_VERSION) return next;
  const mastery = { ...(next.wordMastery ?? {}) };
  const ids = new Set([...Object.keys(next.vocabSeen ?? {}), ...Object.keys(next.tricky ?? {})]);
  for (const vocabId of ids) {
    if (mastery[vocabId]) continue;
    const seen = next.vocabSeen?.[vocabId];
    const tricky = next.tricky?.[vocabId];
    mastery[vocabId] = {
      vocabId,
      masteryStage: tricky ? 0 : seen?.corrects ? 1 : 0,
      correctStreak: tricky?.streak ?? 0,
      incorrectCount: tricky?.misses ?? 0,
      lastSeen: seen?.at ? new Date(seen.at).toISOString() : "",
      nextReview: new Date(tricky ? Date.now() : (seen?.at ?? Date.now())).toISOString(),
      definitionScore: seen?.corrects ?? 0,
      synonymScore: 0,
      antonymScore: 0,
      contextScore: 0,
      distinctionScore: 0,
      recallScore: 0,
    };
  }
  return { ...next, vocabMigrationVersion: VOCAB_MIGRATION_VERSION, wordMastery: mastery };
}

const seedRewards = (prefix: ProfileId): Reward[] => {
  const src = REWARDS_BY_GIRL[prefix as "bianca" | "calista"];
  if (!src) return []; // test profile starts with no rewards
  return src.map((r, i) => ({ id: `${prefix}-seed-${i}`, name: r.name, xp: r.xp }));
};

const defaultShared = (): SharedState => ({
  pin: "1701",
  rewards: { bianca: seedRewards("bianca"), calista: seedRewards("calista") },
});

/** Made-up rewards from an earlier seed that were never specified by the parent.
 *  Purged once from existing saves so the lists only hold real items. */
const PURGE_REWARD_NAMES = new Set([
  "Concert tickets — any show",
  "Gold hoop earrings (Amazon)",
  "The rhode kit",
  "Sephora item under $25",
  "Book of her choice (up to $15)",
  "Extra phone time (1 hour)",
  "Pick family dinner",
]);
const dropMadeUp = (list: Reward[]) => list.filter((r) => !PURGE_REWARD_NAMES.has(r.name));

/** Older saves kept one shared list — split it so each girl gets her own copy. */
function normalizeShared(s: SharedState): SharedState {
  const rw = s.rewards as unknown;
  if (Array.isArray(rw)) {
    const list = rw as Reward[];
    return {
      ...s,
      rewards: {
        bianca: dropMadeUp(list.map((r) => ({ ...r, id: `bianca-${r.id}` }))),
        calista: dropMadeUp(list.map((r) => ({ ...r, id: `calista-${r.id}` }))),
      },
    };
  }
  const rec = (rw ?? {}) as Partial<Record<ProfileId, Reward[]>>;
  return {
    ...s,
    rewards: {
      bianca: rec.bianca ? dropMadeUp(rec.bianca) : seedRewards("bianca"),
      calista: rec.calista ? dropMadeUp(rec.calista) : seedRewards("calista"),
    },
  };
}

/**
 * Small persistence boundary shared by the current local-only app and the
 * future sync layer. Feature code should use the store helpers below rather
 * than reaching into window.localStorage directly.
 */
export type QuestStorage = {
  read<T>(key: string, fallback: T): T;
  write(key: string, value: unknown): void;
};

export const localQuestStorage: QuestStorage = {
  read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return { ...fallback, ...(JSON.parse(raw) as object) } as T;
    } catch {
      return fallback;
    }
  },
  write(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    if (
      !migrationMaterializationBypass &&
      window.localStorage.getItem(MIGRATION_CUTOVER_LOCK_KEY) &&
      (key === SHARED_KEY || key.startsWith("ssatquest.v8.profile."))
    )
      return;
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ssatquest:change", { detail: key }));
  },
};

export const FAMILY_TIME_ZONE = "America/Los_Angeles";
const CALENDAR_CUTOVER_KEY = "ssatquest.phase1.calendar-cutover";

export type CalendarCutover = {
  cutoverAt: string;
  legacyUtcDate: string;
  familyDate: string;
};

function normalizeFamilyCalendar(profile: ProfileState, now = new Date()): ProfileState {
  if (typeof window === "undefined" || profile.familyCalendarMigration?.version === 1)
    return profile;
  getOrCreateCalendarCutover(now);
  const legacyUtcDate = now.toISOString().slice(0, 10);
  const familyDate = familyDayKey(now);
  const overlappingLegacyDay =
    legacyUtcDate === familyDate ? undefined : profile.days[legacyUtcDate];
  const migration: NonNullable<ProfileState["familyCalendarMigration"]> = {
    version: 1,
    cutoverAt: now.toISOString(),
    legacyUtcDate,
    familyDate,
  };
  if (overlappingLegacyDay) migration.overlappingLegacyDay = { ...overlappingLegacyDay };
  return { ...profile, familyCalendarMigration: migration };
}

function dateKeyAt(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function familyDayKey(date = new Date()): string {
  return dateKeyAt(date, FAMILY_TIME_ZONE);
}

/**
 * Records the one-time UTC -> family-calendar transition without modifying any
 * historical day keys. On the cutover day only, dayOf() folds the overlapping
 * UTC record into the new family day so +20/+25/+15 bonuses cannot be awarded
 * twice. Migration exports this marker and creates matching zero-delta claims.
 */
export function getOrCreateCalendarCutover(now = new Date()): CalendarCutover | null {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(CALENDAR_CUTOVER_KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as CalendarCutover;
    } catch {
      // Replace a corrupt marker; raw migration backup still preserves it.
    }
  }
  const marker: CalendarCutover = {
    cutoverAt: now.toISOString(),
    legacyUtcDate: now.toISOString().slice(0, 10),
    familyDate: familyDayKey(now),
  };
  window.localStorage.setItem(CALENDAR_CUTOVER_KEY, JSON.stringify(marker));
  return marker;
}

function read<T>(key: string, fallback: T): T {
  return localQuestStorage.read(key, fallback);
}

function write(key: string, value: unknown) {
  localQuestStorage.write(key, value);
}

export const todayKey = () => familyDayKey();

function useStored<T>(
  key: string,
  fallback: () => T,
  normalize: (value: T) => T = (value) => value,
) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const readNormalized = () => {
      const stored = read(key, fallback());
      const next = normalize(stored);
      if (next !== stored) write(key, next);
      return next;
    };
    setValue(readNormalized());
    const onChange = () => setValue(readNormalized());
    window.addEventListener("ssatquest:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ssatquest:change", onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (fn: (prev: T) => T) => {
      const next = fn(read(key, fallback()));
      const normalized = normalize(next);
      write(key, normalized);
      setValue(normalized);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update] as const;
}

export function useShared() {
  const [value, update] = useStored<SharedState>(SHARED_KEY, defaultShared);
  const shared = normalizeShared(value);
  const updateShared = useCallback(
    (fn: (prev: SharedState) => SharedState) => update((prev) => fn(normalizeShared(prev))),
    [update],
  );
  return [shared, updateShared] as const;
}

/** Wishlist for one girl only. */
export function rewardsFor(shared: SharedState, id: ProfileId): Reward[] {
  return shared.rewards[id] ?? [];
}

/** Whether the kid-facing reward UI (ring, wishlist, redemption) is shown.
 *  Default OFF: rewards stay hidden until the parent turns them on. */
export function rewardsVisible(shared: SharedState): boolean {
  return shared.showRewards === true;
}

export function useProfile(id: ProfileId) {
  return useStored<ProfileState>(profileKey(id), emptyProfile, (profile) =>
    normalizeFamilyCalendar(normalizeProfile(id, profile)),
  );
}

export function readProfile(id: ProfileId) {
  const stored = read<ProfileState>(profileKey(id), emptyProfile());
  const normalized = normalizeFamilyCalendar(normalizeProfile(id, stored));
  if (normalized !== stored) write(profileKey(id), normalized);
  return normalized;
}
export function writeProfile(id: ProfileId, p: ProfileState) {
  write(profileKey(id), p);
}

/**
 * Rebases only the spendable/lifetime balance cache after a newer confirmed
 * cloud projection. Analogy history, daily activity, drill state, and
 * Vocabulary V1 mastery are deliberately copied through untouched.
 */
export function applyCloudBalanceCache(
  id: ProfileId,
  balance: { lifetimeXp: number; availableXp: number; version: number },
) {
  if (typeof window === "undefined") return false;
  const versionKey = `ssatquest.phase1.balance-version.${id}`;
  const currentVersion = Number(window.localStorage.getItem(versionKey) ?? "-1");
  if (!Number.isSafeInteger(balance.version) || balance.version <= currentVersion) return false;
  if (
    !Number.isSafeInteger(balance.lifetimeXp) ||
    !Number.isSafeInteger(balance.availableXp) ||
    balance.lifetimeXp < 0 ||
    balance.availableXp < 0
  )
    return false;
  const current = readProfile(id);
  writeProfile(id, {
    ...current,
    lifetimeXp: balance.lifetimeXp,
    availableXp: balance.availableXp,
  });
  window.localStorage.setItem(versionKey, String(balance.version));
  return true;
}

/**
 * Finalizes an explicitly requested cloud-to-local rollback. Only synchronized
 * balance/reward/redemption fields are replaced; all local learning fields are
 * copied through unchanged. The caller must first prove the sync outbox empty.
 */
export function materializeCloudRollback(
  id: ProfileId,
  cloud: {
    lifetimeXp: number;
    availableXp: number;
    approvedRewards: Reward[];
    activeRewardId: string | null;
    redemptions: Redemption[];
    showRewards: boolean;
  },
) {
  migrationMaterializationBypass = true;
  try {
    const profile = readProfile(id);
    writeProfile(id, {
      ...profile,
      lifetimeXp: cloud.lifetimeXp,
      availableXp: cloud.availableXp,
      activeRewardId: cloud.activeRewardId,
      redemptions: cloud.redemptions,
    });
    const shared = normalizeShared(read<SharedState>(SHARED_KEY, defaultShared()));
    write(SHARED_KEY, {
      ...shared,
      showRewards: cloud.showRewards,
      rewards: { ...shared.rewards, [id]: cloud.approvedRewards },
    });
  } finally {
    migrationMaterializationBypass = false;
  }
}

/** Wipe one profile's progress back to zero (XP, streak, history, current drill). */
export function resetProfile(id: ProfileId) {
  write(profileKey(id), {
    ...emptyProfile(),
    dataVersion: id === "test" ? undefined : PROFILE_DATA_VERSION,
  });
}

/** Award XP (lifetime + available together). */
export function addXp(p: ProfileState, amount: number): ProfileState {
  return { ...p, lifetimeXp: p.lifetimeXp + amount, availableXp: p.availableXp + amount };
}

export function dayOf(p: ProfileState, day = todayKey()) {
  const current = p.days[day];
  const cutover = p.familyCalendarMigration;
  const overlappingLegacy =
    cutover && day === cutover.familyDate && !cutover.overlapMaterialized
      ? cutover.overlappingLegacyDay
      : undefined;
  // The old UTC key can name the following LA day. Its exact original value is
  // preserved above, while this date starts clean until its first LA-v1 write.
  if (
    cutover &&
    day === cutover.legacyUtcDate &&
    cutover.legacyUtcDate !== cutover.familyDate &&
    !cutover.legacyDayRebased
  ) {
    return { completed: 0, exitTicket: false, dayBonus: false, vocabDone: 0, vocabBonus: false };
  }
  if (!current && !overlappingLegacy) return { completed: 0, exitTicket: false, dayBonus: false };
  return {
    completed: (current?.completed ?? 0) + (overlappingLegacy?.completed ?? 0),
    exitTicket: (current?.exitTicket ?? false) || (overlappingLegacy?.exitTicket ?? false),
    dayBonus: (current?.dayBonus ?? false) || (overlappingLegacy?.dayBonus ?? false),
    vocabDone: (current?.vocabDone ?? 0) + (overlappingLegacy?.vocabDone ?? 0),
    vocabBonus: (current?.vocabBonus ?? false) || (overlappingLegacy?.vocabBonus ?? false),
  };
}

export function setDay(
  p: ProfileState,
  patch: Partial<{
    completed: number;
    exitTicket: boolean;
    dayBonus: boolean;
    vocabDone: number;
    vocabBonus: boolean;
  }>,
  day = todayKey(),
): ProfileState {
  const next = { ...p, days: { ...p.days, [day]: { ...dayOf(p, day), ...patch } } };
  const cutover = p.familyCalendarMigration;
  if (
    cutover &&
    day === cutover.familyDate &&
    cutover.legacyUtcDate !== cutover.familyDate &&
    !cutover.legacyDayRebased
  ) {
    return {
      ...next,
      familyCalendarMigration: { ...cutover, overlapMaterialized: true },
    };
  }
  if (
    cutover &&
    day === cutover.legacyUtcDate &&
    cutover.legacyUtcDate !== cutover.familyDate &&
    !cutover.legacyDayRebased
  ) {
    return {
      ...next,
      familyCalendarMigration: { ...cutover, legacyDayRebased: true },
    };
  }
  return next;
}

/** +25 once when 8 questions done AND exit ticket awarded that day. */
export function maybeDayBonus(p: ProfileState): ProfileState {
  const d = dayOf(p);
  if (!d.dayBonus && d.completed >= 8 && d.exitTicket) {
    return setDay(addXp(p, 25), { dayBonus: true });
  }
  return p;
}

export const MASCOT_TIERS = [
  { xp: 500, name: "Pink bow" },
  { xp: 1000, name: "Round glasses" },
  { xp: 2000, name: "Gold crown" },
];

/* ---------------- Streaks & XP milestones ---------------- */

export const XP_MILESTONES = [
  { xp: 100, name: "First Bloom" },
  { xp: 250, name: "Sketchbook Star" },
  { xp: 500, name: "Bridge Builder" },
  { xp: 1000, name: "Analogy Ace" },
  { xp: 2000, name: "Quest Champion" },
];

export function milestoneProgress(lifetimeXp: number) {
  const unlocked = XP_MILESTONES.filter((m) => lifetimeXp >= m.xp);
  const next = XP_MILESTONES.find((m) => lifetimeXp < m.xp) ?? null;
  const prevXp = unlocked.length ? (unlocked[unlocked.length - 1]?.xp ?? 0) : 0;
  const pct = next
    ? Math.round(((lifetimeXp - prevXp) / Math.max(1, next.xp - prevXp)) * 100)
    : 100;
  return { unlocked, next, pct, remaining: next ? next.xp - lifetimeXp : 0 };
}

/** Streaks derived from finished questions — skipping breaks the focus streak. */
export function streakStats(history: Attempt[] = []) {
  const answered = history.filter((h) => !h.skipped).length;
  const skipped = history.filter((h) => h.skipped).length;

  let focus = 0;
  let bestFocus = 0;
  let correct = 0;
  let bestCorrect = 0;
  for (const h of history) {
    if (h.skipped) {
      focus = 0;
      correct = 0;
      continue;
    }
    focus += 1;
    bestFocus = Math.max(bestFocus, focus);
    correct = h.correct ? correct + 1 : 0;
    bestCorrect = Math.max(bestCorrect, correct);
  }

  const total = answered + skipped;
  return {
    answered,
    skipped,
    focusStreak: focus,
    bestFocusStreak: bestFocus,
    correctStreak: correct,
    bestCorrectStreak: bestCorrect,
    focusRate: total ? Math.round((answered / total) * 100) : 100,
  };
}
