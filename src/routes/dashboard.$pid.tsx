import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { DoodleField, Flower, BouncyTap } from "@/components/quest/Doodles";
import { ProgressRing } from "@/components/quest/Bits";
import { Mascot, nextUnlock } from "@/components/quest/Mascot";
import {
  PROFILES,
  dayOf,
  useProfile,
  useShared,
  rewardsFor,
  milestoneProgress,
  streakStats,
  XP_MILESTONES,
  type ProfileId,
} from "@/lib/quest-store";

export const Route = createFileRoute("/dashboard/$pid")({
  head: () => ({
    meta: [
      { title: "Quest Dashboard — SSAT Quest" },
      { name: "description", content: "Your XP, streak, mascot, and reward progress in SSAT Quest." },
      { property: "og:title", content: "Quest Dashboard — SSAT Quest" },
      { property: "og:description", content: "XP, streak, mascot unlocks, and reward progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { pid } = useParams({ from: "/dashboard/$pid" });
  const id = (pid === "calista" ? "calista" : "bianca") as ProfileId;
  const meta = PROFILES.find((p) => p.id === id)!;
  const [p, update] = useProfile(id);
  const [shared] = useShared();

  const active = rewardsFor(shared, id).find((r) => r.id === p.activeRewardId) ?? null;
  const reached = !!active && p.availableXp >= active.xp;
  const pending = p.redemptions.find((r) => r.status === "pending");
  const unlock = nextUnlock(p.lifetimeXp);
  const today = dayOf(p);
  const stats = streakStats(p.history ?? []);
  const ms = milestoneProgress(p.lifetimeXp);

  const [party, setParty] = useState<string | null>(null);
  useEffect(() => {
    const fresh = p.redemptions.find((r) => r.status === "approved" && !r.celebrated);
    if (!fresh) return;
    setParty(fresh.name);
    update((prev) => ({
      ...prev,
      redemptions: prev.redemptions.map((r) => (r.id === fresh.id ? { ...r, celebrated: true } : r)),
    }));
    const t = setTimeout(() => setParty(null), 4000);
    return () => clearTimeout(t);
  }, [p.redemptions, update]);

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
          <Link to="/" className="min-h-[48px] rounded-full border border-border px-5 py-3 text-base">
            ← Switch
          </Link>
          <h1 className="script-type text-5xl sm:text-6xl" style={{ color: meta.accent }}>
            {meta.name}
          </h1>
          <Link to="/parent" className="min-h-[48px] rounded-full border border-border px-5 py-3 text-base text-muted-foreground">
            Parent
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* XP + reward ring */}
          <section className="quest-card relative overflow-hidden p-7">
            
            <h2 className="text-xl font-extrabold">Reward progress</h2>
            <div className="mt-5 flex items-center gap-6">
              <ProgressRing
                value={active ? p.availableXp : 0}
                max={active ? active.xp : 1}
                size={150}
                color={meta.accent}
                glow={reached}
              >
                <div>
                  <div className="text-4xl font-extrabold">{p.availableXp}</div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    XP ready
                  </div>
                </div>
              </ProgressRing>
              <div className="space-y-2">
                <p className="text-lg font-bold">{active ? active.name : "No active reward yet"}</p>
                {active && (
                  <p className="text-muted-foreground">
                    {p.availableXp} / {active.xp} XP
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Lifetime XP: {p.lifetimeXp}</p>
                <p className="text-sm text-muted-foreground">Streak: {p.streak} 🔥</p>
                <p className="text-sm text-muted-foreground">Today: {today.completed} questions</p>
                {pending ? (
                  <div className="rounded-full bg-primary/20 px-4 py-2 text-base font-bold text-primary">
                    Waiting for Mom — {pending.name}
                  </div>
                ) : (
                  reached && (
                    <BouncyTap onClick={redeem} className="glow-pink bg-primary px-6 py-3 text-lg text-primary-foreground">
                      Redeem
                    </BouncyTap>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Mascot */}
          <section className="quest-card relative overflow-hidden p-7 text-center">
            <Flower className="-left-5 bottom-0" size={90} rotate={-14} opacity={0.14} variant={3} />
            <h2 className="text-xl font-extrabold">Study buddy</h2>
            <div className="mt-2 flex justify-center">
              <Mascot lifetimeXp={p.lifetimeXp} size={170} />
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              {unlock
                ? `Next unlock: ${unlock.name} at ${unlock.xp} lifetime XP (${unlock.remaining} to go)`
                : "Every accessory unlocked — royal owl!"}
            </p>
          </section>
        </div>

        {/* Streaks */}
        <section className="quest-card relative overflow-hidden p-7">
          <Flower className="-right-4 -top-3" size={84} rotate={12} opacity={0.12} variant={2} />
          <h2 className="text-xl font-extrabold">Streaks</h2>
          <p className="text-sm text-muted-foreground">
            Finishing a question keeps your streak alive — skipping resets it.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Finish streak", value: `${stats.focusStreak} 🔥`, sub: `Best ${stats.bestFocusStreak}` },
              { label: "Correct streak", value: `${stats.correctStreak} ✨`, sub: `Best ${stats.bestCorrectStreak}` },
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
              const done = p.lifetimeXp >= m.xp;
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



        <BouncyTap
          onClick={() => {
            window.location.href = `/practice/${id}`;
          }}
          className="glow-pink w-full bg-primary py-6 text-3xl text-primary-foreground"
        >
          {p.current ? "Resume practice →" : "Start practicing →"}
        </BouncyTap>

        {/* Wishlist */}
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

        {p.redemptions.length > 0 && (
          <section className="quest-card p-7">
            <h2 className="text-xl font-extrabold">Redemption history</h2>
            <ul className="mt-3 space-y-2">
              {p.redemptions.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 text-base">
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.status === "pending" ? "Waiting for Mom" : r.status === "approved" ? "Redeemed! 🎉" : "Not yet"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="pb-6 text-center text-xs tracking-widest text-muted-foreground/70">SSAT Quest v8</p>
      </div>
    </main>
  );
}
