import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { DoodleField, Flower } from "@/components/quest/Doodles";
import { ProgressRing } from "@/components/quest/Bits";
import {
  PROFILES,
  useProfile,
  useShared,
  rewardsFor,
  rewardsVisible,
  type ProfileId,
} from "@/lib/quest-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSAT Quest — Analogy Practice for Bianca & Calista" },
      {
        name: "description",
        content:
          "A playful Middle Level SSAT analogy trainer: build a bridge sentence, run the monkey test, earn XP toward real rewards.",
      },
      { property: "og:title", content: "SSAT Quest — Analogy Practice" },
      {
        property: "og:description",
        content:
          "Bridge sentences, the monkey test, and XP rewards for Middle Level SSAT analogies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function ProfileCard({ id, name }: { id: ProfileId; name: string; accent: string }) {
  const [p] = useProfile(id);
  const [shared] = useShared();
  const showRewards = rewardsVisible(shared);
  const active = rewardsFor(shared, id).find((r) => r.id === p.activeRewardId) ?? null;
  const pending = p.redemptions.some((r) => r.status === "pending");

  return (
    <Link to="/dashboard/$pid" params={{ pid: id }} className="block">
      <motion.div
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: "spring", stiffness: 380, damping: 20 }}
        className="quest-card relative overflow-visible p-8"
      >
        <Flower
          className="-bottom-10 left-2 z-30"
          size={112}
          rotate={-6}
          opacity={0.22}
          variant={0}
        />

        <h2 className="script-type text-6xl text-primary">{name}</h2>

        <div className="mt-6 flex items-center gap-7">
          <ProgressRing
            value={showRewards && active ? p.availableXp : 0}
            max={showRewards && active ? active.xp : 1}
            color="var(--pink)"
            glow={showRewards && !!active && p.availableXp >= active.xp}
          >
            <div>
              <div className="text-3xl font-extrabold text-primary">{p.availableXp}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">XP</div>
            </div>
          </ProgressRing>

          <div className="space-y-2 text-left">
            <Stat label="Lifetime XP" value={p.lifetimeXp} />
            <Stat label="Streak" value={`${p.streak} 🔥`} />
            {showRewards && (
              <div className="text-[15px] text-muted-foreground">
                {active ? (
                  <>
                    <span className="font-bold text-foreground">{active.name}</span>
                    <br />
                    <span className="font-bold text-primary">
                      {p.availableXp} / {active.xp} XP
                    </span>
                  </>
                ) : (
                  "Pick a reward to chase"
                )}
              </div>
            )}
            {showRewards && pending && (
              <div className="inline-block rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
                Waiting for Mom
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-extrabold text-primary">{value}</span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function Landing() {
  return (
    <main className="relative min-h-screen px-6 py-12">
      <DoodleField seed={0} />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="relative mb-12 text-center">
          <h1 className="script-type text-7xl text-primary sm:text-8xl">SSAT Quest</h1>
          <p className="mt-3 text-xl text-muted-foreground">Analogies. Bridges. Treasure.</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {PROFILES.map((p) => (
            <ProfileCard key={p.id} id={p.id} name={p.name} accent={p.accent} />
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/parent"
            className="inline-flex min-h-[48px] items-center rounded-full border border-border px-6 text-base text-muted-foreground"
          >
            Parent
          </Link>
          <p className="mt-6 text-xs tracking-widest text-muted-foreground/70">SSAT Quest v8</p>
        </div>
      </div>
    </main>
  );
}
