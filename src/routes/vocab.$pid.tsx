import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VOCAB_ITEMS, type VocabItem } from "@/data/vocab-items";
import {
  PROFILES,
  TEST_PROFILE,
  type ProfileId,
  useProfile,
  addXp,
  dayOf,
  setDay,
  todayKey,
} from "@/lib/quest-store";
import { BouncyTap } from "@/components/quest/Doodles";
import { Confetti } from "@/components/quest/Progress";

export const Route = createFileRoute("/vocab/$pid")({ component: VocabDrill });

export const VOCAB_DAILY_GOAL = 20;
/** Corrects-in-a-row needed for a tricky word to leave the list. */
const ESCAPE_STREAK = 2;

/** Pick the next word: tricky words first (oldest missed), then never-seen, then least-recently-seen. */
function pickNext(
  tricky: Record<string, { misses: number; streak: number; addedAt: number }>,
  seen: Record<string, { at: number; corrects: number }>,
  lastId: string | null,
): VocabItem {
  const pool = VOCAB_ITEMS.filter((v) => v.id !== lastId);
  const trickyIds = Object.keys(tricky);
  if (trickyIds.length > 0) {
    // 60% chance serve a tricky word (don't make it feel like pure punishment)
    const serveTricky = Math.random() < 0.6;
    if (serveTricky) {
      const candidates = pool.filter((v) => trickyIds.includes(v.id));
      if (candidates.length > 0) {
        candidates.sort((a, b) => (tricky[a.id]?.addedAt ?? 0) - (tricky[b.id]?.addedAt ?? 0));
        return candidates[0]!;
      }
    }
  }
  const unseen = pool.filter((v) => !seen[v.id]);
  if (unseen.length > 0) return unseen[Math.floor(Math.random() * unseen.length)]!;
  // everything seen: serve least-recently-seen
  const sorted = [...pool].sort((a, b) => (seen[a.id]?.at ?? 0) - (seen[b.id]?.at ?? 0));
  return sorted[0] ?? VOCAB_ITEMS[0]!;
}

function VocabDrill() {
  const { pid } = useParams({ from: "/vocab/$pid" });
  const id = (pid === "calista" ? "calista" : pid === "test" ? "test" : "bianca") as ProfileId;
  const meta = [...PROFILES, TEST_PROFILE].find((p) => p.id === id)!;
  const [p, update] = useProfile(id);

  const tricky = p.tricky ?? {};
  const seen = p.vocabSeen ?? {};
  const today = dayOf(p);
  const done = today.vocabDone ?? 0;

  const [item, setItem] = useState<VocabItem>(() => pickNext(tricky, seen, null));
  const [picked, setPicked] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const isTricky = !!tricky[item.id];
  const answered = picked !== null;
  const right = picked === item.correct;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const choose = (label: string) => {
    if (answered) return;
    setPicked(label);
    const correct = label === item.correct;
    update((prev) => {
      let next = { ...prev };
      const t = { ...(prev.tricky ?? {}) };
      const vs = { ...(prev.vocabSeen ?? {}) };
      const rec = vs[item.id] ?? { at: 0, corrects: 0 };
      vs[item.id] = { at: Date.now(), corrects: rec.corrects + (correct ? 1 : 0) };

      if (correct) {
        const entry = t[item.id];
        if (entry) {
          const streak = entry.streak + 1;
          if (streak >= ESCAPE_STREAK) {
            delete t[item.id]; // escaped the list!
          } else {
            t[item.id] = { ...entry, streak };
          }
        }
        // XP: 2 base, 3 if it was a tricky word (comeback pays)
        next = addXp(next, entry ? 3 : 2);
      } else {
        const entry = t[item.id];
        t[item.id] = entry
          ? { ...entry, misses: entry.misses + 1, streak: 0 }
          : { misses: 1, streak: 0, addedAt: Date.now() };
      }

      // count toward today's vocab goal (right or wrong — effort counts; the word repeats anyway)
      const day = dayOf(next);
      const newDone = (day.vocabDone ?? 0) + 1;
      let vocabBonus = day.vocabBonus ?? false;
      if (newDone === VOCAB_DAILY_GOAL && !vocabBonus) {
        vocabBonus = true;
        next = addXp(next, 15); // daily vocab goal bonus
      }
      next = setDay(next, { vocabDone: newDone, vocabBonus });
      return { ...next, tricky: t, vocabSeen: vs };
    });
    if (correct) {
      setBurst((b) => b + 1);
      const wasTricky = !!tricky[item.id];
      const entry = tricky[item.id];
      if (wasTricky && entry && entry.streak + 1 >= ESCAPE_STREAK) {
        flash(`+3 XP — "${item.word}" is OFF your tricky list! 🎉`);
      } else if (wasTricky) {
        flash(`+3 XP — one more right and "${item.word}" is off the list`);
      } else {
        flash("+2 XP");
      }
      const newDone = done + 1;
      if (newDone === VOCAB_DAILY_GOAL) flash("+15 XP — daily 20 done! 🏆");
    }
  };

  const nextWord = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setItem(pickNext(p.tricky ?? {}, p.vocabSeen ?? {}, item.id));
    setPicked(null);
  };

  const trickyCount = Object.keys(tricky).length;
  const pct = Math.min(100, Math.round((done / VOCAB_DAILY_GOAL) * 100));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-24 pt-6">
      <Confetti fire={burst} />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/dashboard/$pid"
          params={{ pid: id }}
          className="min-h-[44px] rounded-full border border-border px-4 py-2 text-sm"
        >
          ← {meta.name.split(" ")[0]}'s dashboard
        </Link>
        {trickyCount > 0 && (
          <span className="rounded-full bg-destructive/15 px-3 py-1 text-sm font-bold text-destructive">
            {trickyCount} tricky word{trickyCount === 1 ? "" : "s"} waiting
          </span>
        )}
      </header>

      {/* Daily goal bar */}
      <section className="quest-card mb-5 space-y-2 p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>
            Today's words: {done} / {VOCAB_DAILY_GOAL}
            {done >= VOCAB_DAILY_GOAL && " — goal smashed, keep going! 🎉"}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary/40">
          <motion.div
            animate={{ width: `${pct}%` }}
            className="h-full rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </section>

      {/* The word */}
      <section className="quest-card space-y-4 p-7">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {item.word.toUpperCase()}
          </h1>
          {isTricky && (
            <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
              tricky — beat it {ESCAPE_STREAK - (tricky[item.id]?.streak ?? 0)}× to clear
            </span>
          )}
        </div>
        {item.root && (
          <p className="text-base text-muted-foreground">
            🔑 Spot the root: <b>{item.root}</b> = {item.rootMeaning}. Do the math, then pick.
          </p>
        )}
        {!item.root && (
          <p className="text-base text-muted-foreground">
            No root key on this one — trust the technique: charge, word-inside-word, then your gut.
          </p>
        )}

        <div className="space-y-2">
          {item.choices.map((c) => {
            const isPicked = picked === c.label;
            const isRight = c.label === item.correct;
            const show = answered && (isPicked || isRight);
            return (
              <div key={c.label}>
                <BouncyTap
                  onClick={() => choose(c.label)}
                  className={`w-full border px-4 py-3 text-left text-base ${
                    !answered
                      ? "border-border"
                      : isRight
                        ? "border-green-600 bg-green-600/10"
                        : isPicked
                          ? "border-destructive bg-destructive/10"
                          : "border-border opacity-50"
                  }`}
                >
                  <b>({c.label})</b> {c.text}
                </BouncyTap>
                {show && (
                  <p
                    className={`mt-1 px-2 text-sm ${isRight ? "text-green-700" : "text-destructive"}`}
                  >
                    {c.why}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {answered && (
          <BouncyTap
            onClick={nextWord}
            className="w-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground"
          >
            Next word →
          </BouncyTap>
        )}
        {answered && !right && (
          <p className="text-center text-sm text-muted-foreground">
            "{item.word}" joins your tricky list — it'll come back until you beat it twice in a row.
          </p>
        )}
      </section>
    </main>
  );
}
