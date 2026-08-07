import { useCallback, useEffect, useState } from "react";
import { SEED_REWARDS } from "@/data/questions";

export type ProfileId = "bianca" | "calista";

export const PROFILES: { id: ProfileId; name: string; age: number; accent: string }[] = [
  { id: "bianca", name: "Bianca", age: 12, accent: "#FF7A6B" },
  { id: "calista", name: "Calista", age: 10, accent: "#B69CFF" },
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
};

export type SharedState = { pin: string; rewards: Reward[] };

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

const defaultShared = (): SharedState => ({
  pin: "1701",
  rewards: SEED_REWARDS.map((r, i) => ({ id: `seed-${i}`, name: r.name, xp: r.xp })),
});

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
  return useStored<SharedState>(SHARED_KEY, defaultShared);
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
