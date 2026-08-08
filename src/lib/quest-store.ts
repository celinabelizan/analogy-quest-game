import { useCallback, useEffect, useState } from "react";
import { SEED_REWARDS } from "@/data/questions";

export type ProfileId = "bianca" | "calista";

export const PROFILES: { id: ProfileId; name: string; age: number; accent: string }[] = [
  { id: "bianca", name: "Bianca", age: 12, accent: "#FF2E93" },
  { id: "calista", name: "Calista", age: 10, accent: "#00C4B4" },
];

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
  lifetimeXp: number;
  availableXp: number;
  streak: number;
  activeRewardId: string | null;
  redemptions: Redemption[];
  seenAt: Record<string, number>;
  completedCount: number;
  recent: string[];
  days: Record<string, { completed: number; exitTicket: boolean; dayBonus: boolean }>;
  current: Drill | null;
  /** One entry per finished question, newest last. */
  history?: Attempt[];
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
 *  Undefined = all six on (backward compatible with older saves). */
export type SharedState = {
  pin: string;
  rewards: Record<ProfileId, Reward[]>;
  enabledGroups?: string[];
};

const SHARED_KEY = "ssatquest.v8.shared";
const profileKey = (id: ProfileId) => `ssatquest.v8.profile.${id}`;

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

const seedRewards = (prefix: string): Reward[] =>
  SEED_REWARDS.map((r, i) => ({ id: `${prefix}-seed-${i}`, name: r.name, xp: r.xp }));

const defaultShared = (): SharedState => ({
  pin: "1701",
  rewards: { bianca: seedRewards("bianca"), calista: seedRewards("calista") },
});

/** Older saves kept one shared list — split it so each girl gets her own copy. */
function normalizeShared(s: SharedState): SharedState {
  const rw = s.rewards as unknown;
  if (Array.isArray(rw)) {
    const list = rw as Reward[];
    return {
      ...s,
      rewards: {
        bianca: list.map((r) => ({ ...r, id: `bianca-${r.id}` })),
        calista: list.map((r) => ({ ...r, id: `calista-${r.id}` })),
      },
    };
  }
  const rec = (rw ?? {}) as Partial<Record<ProfileId, Reward[]>>;
  return {
    ...s,
    rewards: {
      bianca: rec.bianca ?? seedRewards("bianca"),
      calista: rec.calista ?? seedRewards("calista"),
    },
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ssatquest:change", { detail: key }));
}

export const todayKey = () => new Date().toISOString().slice(0, 10);

function useStored<T>(key: string, fallback: () => T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(read(key, fallback()));
    const onChange = () => setValue(read(key, fallback()));
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
      write(key, next);
      setValue(next);
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

export function useProfile(id: ProfileId) {
  return useStored<ProfileState>(profileKey(id), emptyProfile);
}

export function readProfile(id: ProfileId) {
  return read<ProfileState>(profileKey(id), emptyProfile());
}
export function writeProfile(id: ProfileId, p: ProfileState) {
  write(profileKey(id), p);
}

/** Award XP (lifetime + available together). */
export function addXp(p: ProfileState, amount: number): ProfileState {
  return { ...p, lifetimeXp: p.lifetimeXp + amount, availableXp: p.availableXp + amount };
}

export function dayOf(p: ProfileState, day = todayKey()) {
  return p.days[day] ?? { completed: 0, exitTicket: false, dayBonus: false };
}

export function setDay(
  p: ProfileState,
  patch: Partial<{ completed: number; exitTicket: boolean; dayBonus: boolean }>,
  day = todayKey(),
): ProfileState {
  return { ...p, days: { ...p.days, [day]: { ...dayOf(p, day), ...patch } } };
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
