import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { DoodleField, Flower, BouncyTap } from "@/components/quest/Doodles";
import { ProgressRing } from "@/components/quest/Bits";
import { Mascot, nextUnlock } from "@/components/quest/Mascot";
import { ChildRewardCenter } from "@/components/rewards/ChildRewardCenter";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { usePhase1Snapshot } from "@/components/sync/bridge";
import { ChildProfileBoundary } from "@/components/sync/ChildProfileBoundary";
import {
  PROFILES,
  TEST_PROFILE,
  dayOf,
  useProfile,
  useShared,
  rewardsFor,
  rewardsVisible,
  milestoneProgress,
  streakStats,
  XP_MILESTONES,
  type ProfileId,
} from "@/lib/quest-store";

export const Route = createFileRoute("/dashboard/$pid")({
  head: () => ({
    meta: [
      { title: "Quest Dashboard — SSAT Quest" },
      {
        name: "description",
        content: "Your XP, streak, mascot, and reward progress in SSAT Quest.",
      },
      { property: "og:title", content: "Quest Dashboard — SSAT Quest" },
      { property: "og:description", content: "XP, streak, mascot unlocks, and reward progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { pid } = useParams({ from: "/dashboard/$pid" });
  const id = (pid === "calista" ? "calista" : pid === "test" ? "test" : "bianca") as ProfileId;
  return (
    <ChildProfileBoundary requestedProfileId={id}>
      <Dashboard />
    </ChildProfileBoundary>
  );
}

function Dashboard() {
  const { pid } = useParams({ from: "/dashboard/$pid" });
  const id = (pid === "calista" ? "calista" : pid === "test" ? "test" : "bianca") as ProfileId;
  const meta = [...PROFILES, TEST_PROFILE].find((p) => p.id === id)!;
  const [p, update] = useProfile(id);
  const [shared] = useShared();
  const sync = usePhase1Snapshot();
  const cloudChild =
    sync.children.find(
      (child) => child.localProfileId === id && child.cloudAuthoritative === true,
    ) ??
    (sync.activeChild?.localProfileId === id && sync.activeChild.cloudAuthoritative === true
      ? sync.activeChild
      : undefined);
  const showRewards = cloudChild ? cloudChild.rewardsVisible : rewardsVisible(shared);
  const hasUnconfirmedLocalXp =
    sync.connection === "offline" ||
    sync.connection === "pending" ||
    sync.connection === "syncing" ||
    sync.connection === "needs_review" ||
    sync.counts.rejected > 0;
  const availableXp = cloudChild && !hasUnconfirmedLocalXp ? cloudChild.availableXp : p.availableXp;
  const lifetimeXp = cloudChild && !hasUnconfirmedLocalXp ? cloudChild.lifetimeXp : p.lifetimeXp;

  const active = rewardsFor(shared, id).find((r) => r.id === p.activeRewardId) ?? null;
  const reached = !!active && availableXp >= active.xp;
  const pending = p.redemptions.find((r) => r.status === "pending");
  const unlock = nextUnlock(lifetimeXp);
  const today = dayOf(p);
  const stats = streakStats(p.history ?? []);
  const ms = milestoneProgress(lifetimeXp);

  const [party, setParty] = useState<string | null>(null);
  useEffect(() => {
    if (cloudChild) return;
    const fresh = p.redemptions.find((r) => r.status === "approved" && !r.celebrated);
    if (!fresh) return;
    setParty(fresh.name);
    update((prev) => ({
      ...prev,
      redemptions: prev.redemptions.map((r) =>
        r.id === fresh.id ? { ...r, celebrated: true } : r,
      ),
    }));
    const t = setTimeout(() => setParty(null), 4000);
    return () => clearTimeout(t);
  }, [cloudChild, p.redemptions, update]);

  const redeem = () => {
    if (!active) return;
    update((prev) => ({
      ...prev,
      redemptions: [
        {
          id: `${Date.now()}`,
          rewardId: active.id,
          name: active.name,
          cost: active.xp,
          status: "pending" as const,
          requestedAt: new Date().toISOString(),
        },
        ...prev.redemptions,
      ],
    }));
  };

  return (
    <main className="relative min-h-screen px-5 py-8 sm:px-8">
      <DoodleField seed={1} />
      <AnimatePresence>
        {party && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-6 text-center backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -6 }}
              animate={{ scale: [0.6, 1.12, 1], rotate: [-6, 3, 0] }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="quest-card glow-pink p-10"
            >
              <p className="script-type text-7xl text-primary">Redeemed!</p>
              <p className="mt-3 text-2xl">{party}</p>
              <p className="mt-2 text-lg text-muted-foreground">Mom approved it. Enjoy! 🎉</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10 mx-auto max-w-5xl space-y-7">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="min-h-[44px] rounded-full border border-border px-4 py-2 text-sm">
            ← Switch
          </Link>
          <h1 className="script-type text-5xl sm:text-6xl" style={{ color: meta.accent }}>
            {meta.name}
          </h1>
          {/* Parent access — discreet gear, not a prominent button */}
          <Link
            to="/parent"
            aria-label="Parent panel"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-border text-lg text-muted-foreground/60"
          >
            ⚙
          </Link>
        </div>

        {/* HERO — the primary action, first thing they see */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          onClick={() => {
            window.location.href = `/practice/${id}`;
          }}
          className="glow-pink relative w-full overflow-hidden rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground"
        >
          <div className="text-4xl font-extrabold sm:text-5xl">
            {p.current ? "Resume practice" : "Start practice"} →
          </div>
          <div className="mt-2 text-lg font-bold opacity-90">
            {p.current
              ? "Pick up right where you left off"
              : today.completed > 0
                ? `${today.completed} done today — keep the streak going 🔥`
                : "Today's goal: 5 questions"}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-base font-bold opacity-95">
            <span>⚡ {availableXp} XP</span>
            <span>🔥 {p.streak} streak</span>
            <span>✓ {today.completed} today</span>
          </div>
        </motion.button>

        {sync.adapterAvailable && <SyncStatus />}

        {/* WORD LAB — the daily 20 vocab drill */}
        <Link to="/vocab/$pid" params={{ pid: id }} className="block">
          <motion.div
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="quest-card flex items-center justify-between gap-4 border-2 px-6 py-5"
            style={{ borderColor: meta.accent }}
          >
            <div>
              <div className="text-2xl font-extrabold">🔑 Word Lab</div>
              <div className="text-base text-muted-foreground">
                {(today.vocabDone ?? 0) >= 20
                  ? `${today.vocabDone} words today — goal smashed 🎉`
                  : `Today's words: ${today.vocabDone ?? 0} / 20`}
                {Object.keys(p.tricky ?? {}).length > 0 &&
                  ` · ${Object.keys(p.tricky ?? {}).length} tricky waiting`}
              </div>
            </div>
            <div className="text-3xl">→</div>
          </motion.div>
        </Link>

        <div className={showRewards ? "grid gap-6 md:grid-cols-2" : "grid gap-6"}>
          {/* XP + reward ring — hidden until parent turns rewards on */}
          {showRewards && !cloudChild && (
            <section className="quest-card relative overflow-hidden p-7">
              <h2 className="text-xl font-extrabold">Reward progress</h2>
              <div className="mt-5 flex items-center gap-6">
                <ProgressRing
                  value={active ? availableXp : 0}
                  max={active ? active.xp : 1}
                  size={150}
                  color={meta.accent}
                  glow={reached}
                >
                  <div>
                    <div className="text-4xl font-extrabold">{availableXp}</div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      XP ready
                    </div>
                  </div>
                </ProgressRing>
                <div className="space-y-2">
                  <p className="text-lg font-bold">
                    {active ? active.name : "No active reward yet"}
                  </p>
                  {active && (
                    <p className="text-muted-foreground">
                      {availableXp} / {active.xp} XP
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Lifetime XP: {lifetimeXp}</p>
                  <p className="text-sm text-muted-foreground">Streak: {p.streak} 🔥</p>
                  <p className="text-sm text-muted-foreground">
                    Today: {today.completed} questions
                  </p>
                  {pending ? (
                    <div className="rounded-full bg-primary/20 px-4 py-2 text-base font-bold text-primary">
                      Waiting for Mom — {pending.name}
                    </div>
                  ) : (
                    reached && (
                      <BouncyTap
                        onClick={redeem}
                        className="glow-pink bg-primary px-6 py-3 text-lg text-primary-foreground"
                      >
                        Redeem
                      </BouncyTap>
                    )
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Mascot */}
          <section className="quest-card relative overflow-visible p-7 text-center">
            <Flower
              className="left-3 -bottom-8 z-30"
              size={104}
              rotate={-14}
              opacity={0.18}
              variant={3}
            />
            <h2 className="text-xl font-extrabold">Study buddy</h2>
            <div className="mt-2 flex justify-center">
              <Mascot lifetimeXp={lifetimeXp} size={170} />
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              {unlock
                ? `Next unlock: ${unlock.name} at ${unlock.xp} lifetime XP (${unlock.remaining} to go)`
                : "Every accessory unlocked — royal owl!"}
            </p>
          </section>
        </div>

        {/* Streaks */}
        <section className="quest-card relative overflow-visible p-7">
          <Flower
            className="right-2 -top-8 z-30"
            size={92}
            rotate={12}
            opacity={0.16}
            variant={2}
          />
          <h2 className="text-xl font-extrabold">Streaks</h2>
          <p className="text-sm text-muted-foreground">
            Finishing a question keeps your streak alive — skipping resets it.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Finish streak",
                value: `${stats.focusStreak} 🔥`,
                sub: `Best ${stats.bestFocusStreak}`,
              },
              {
                label: "Correct streak",
                value: `${stats.correctStreak} ✨`,
                sub: `Best ${stats.bestCorrectStreak}`,
              },
              { label: "Answered", value: `${stats.answered}`, sub: `${stats.skipped} skipped` },
              { label: "Finish rate", value: `${stats.focusRate}%`, sub: "Answered vs skipped" },
            ].map((s) => (
              <motion.div
                key={s.label}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="rounded-3xl border border-border px-4 py-4 text-center"
              >
                <div className="text-3xl font-extrabold" style={{ color: meta.accent }}>
                  {s.value}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* XP milestones */}
        <section className="quest-card relative overflow-hidden p-7">
          <h2 className="text-xl font-extrabold">XP milestones</h2>
          <p className="text-sm text-muted-foreground">
            {ms.next
              ? `${ms.remaining} XP to ${ms.next.name}`
              : "Every milestone unlocked — legendary!"}
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              animate={{ width: `${ms.pct}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
              className="h-full rounded-full"
              style={{ backgroundColor: meta.accent }}
            />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {XP_MILESTONES.map((m) => {
              const done = lifetimeXp >= m.xp;
              return (
                <li
                  key={m.xp}
                  className="flex items-center justify-between gap-3 rounded-3xl border px-4 py-3"
                  style={{
                    borderColor: done ? meta.accent : "var(--border)",
                    backgroundColor: done ? `${meta.accent}1a` : "transparent",
                    opacity: done ? 1 : 0.7,
                  }}
                >
                  <span className="font-bold">
                    {done ? "✓ " : "🔒 "}
                    {m.name}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-primary">{m.xp} XP</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Wishlist — hidden until parent turns rewards on */}
        {showRewards && !cloudChild && (
          <section className="quest-card p-7">
            <h2 className="text-xl font-extrabold">Wishlist</h2>
            <p className="text-sm text-muted-foreground">Tap one to make it your goal.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rewardsFor(shared, id).map((r) => {
                const isActive = r.id === p.activeRewardId;
                return (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    onClick={() => update((prev) => ({ ...prev, activeRewardId: r.id }))}
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-3xl border px-5 py-3 text-left"
                    style={{
                      borderColor: isActive ? meta.accent : "var(--border)",
                      backgroundColor: isActive ? `${meta.accent}22` : "transparent",
                    }}
                  >
                    <span className="font-bold">{r.name}</span>
                    <span className="shrink-0 text-lg font-extrabold text-primary">{r.xp} XP</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {showRewards && !cloudChild && p.redemptions.length > 0 && (
          <section className="quest-card p-7">
            <h2 className="text-xl font-extrabold">Redemption history</h2>
            <ul className="mt-3 space-y-2">
              {p.redemptions.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 text-base">
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.status === "pending"
                      ? "Waiting for Mom"
                      : r.status === "approved"
                        ? "Redeemed! 🎉"
                        : "Not yet"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showRewards && cloudChild && <ChildRewardCenter localProfileId={id} />}

        <p className="pb-6 text-center text-xs tracking-widest text-muted-foreground/70">
          SSAT Quest v8
        </p>
      </div>
    </main>
  );
}
