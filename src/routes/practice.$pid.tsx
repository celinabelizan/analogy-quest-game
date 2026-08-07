import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DoodleField, Flower, BouncyTap } from "@/components/quest/Doodles";
import { FamilyBadge } from "@/components/quest/Bits";
import { ChoiceChecks, Confetti, GoalBar, StepTrail } from "@/components/quest/Progress";
import { QUESTIONS, type Question } from "@/data/questions";
import { monkeySwap, wordCount } from "@/lib/analogy";

import {
  PROFILES,
  addXp,
  dayOf,
  maybeDayBonus,
  setDay,
  useProfile,
  type Drill,
  type Judgment,
  type ProfileId,
  type ProfileState,
} from "@/lib/quest-store";

export const Route = createFileRoute("/practice/$pid")({
  head: () => ({
    meta: [
      { title: "Analogy Drill — SSAT Quest" },
      {
        name: "description",
        content: "Write a bridge sentence, test every choice with the monkey test, then commit to an answer.",
      },
      { property: "og:title", content: "Analogy Drill — SSAT Quest" },
      { property: "og:description", content: "Bridge sentence, monkey test, survivor verdict, final answer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Practice,
});

function pickQuestion(p: ProfileState): { qid: string; xpMode: Drill["xpMode"] } {
  const cycle = p.recent;
  let pool = QUESTIONS.filter((q) => !cycle.includes(q.id));
  if (pool.length === 0) pool = QUESTIONS.filter((q) => q.id !== cycle[cycle.length - 1]);
  const q = pool[Math.floor(Math.random() * pool.length)]!;
  const seenAt = p.seenAt[q.id];
  let xpMode: Drill["xpMode"] = "full";
  if (seenAt !== undefined) xpMode = p.completedCount - seenAt >= 5 ? "repeat" : "none";
  return { qid: q.id, xpMode };
}

function newDrill(p: ProfileState): Drill {
  const { qid, xpMode } = pickQuestion(p);
  return {
    qid,
    phase: "stem",
    bridge: "",
    locked: false,
    monkeyIndex: 0,
    judgments: {},
    awardedBridge: false,
    awardedJudged: [],
    awardedFinal: false,
    finalChoice: null,
    blank: false,
    correct: null,
    ackCorrection: false,
    verdict: null,
    xpMode,
    startedAt: Date.now(),
  };
}

/** XP is only granted through this helper so a refresh can never duplicate it. */
function grant(p: ProfileState, d: Drill, amount: number): ProfileState {
  if (d.xpMode === "none") return p;
  if (d.xpMode === "repeat") return p; // repeat questions get their single +1 at lock time
  return addXp(p, amount);
}

function Practice() {
  const { pid } = useParams({ from: "/practice/$pid" });
  const id = (pid === "calista" ? "calista" : "bianca") as ProfileId;
  const meta = PROFILES.find((p) => p.id === id)!;
  const [p, update] = useProfile(id);
  const navigate = useNavigate();

  const [draft, setDraft] = useState("");
  const [showBreak, setShowBreak] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const sessionStart = useRef(Date.now());
  const hydrated = useRef(false);


  const drill = p.current;
  const q: Question | undefined = useMemo(
    () => QUESTIONS.find((x) => x.id === drill?.qid),
    [drill?.qid],
  );

  // Start a drill on first visit (or resume the saved one).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    update((prev) => (prev.current ? prev : { ...prev, current: newDrill(prev) }));
  }, [update]);

  useEffect(() => {
    if (drill && !drill.locked) setDraft(drill.bridge);
  }, [drill?.qid, drill?.locked]);

  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - sessionStart.current > 20 * 60 * 1000) setShowBreak(true);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  if (!drill || !q) {
    return (
      <main className="grid min-h-screen place-items-center text-2xl text-muted-foreground">Loading…</main>
    );
  }

  const setDrill = (fn: (d: Drill) => Drill, xp?: (p: ProfileState, d: Drill) => ProfileState) => {
    update((prev) => {
      const cur = prev.current;
      if (!cur) return prev;
      const next = fn(cur);
      const withXp = xp ? xp(prev, cur) : prev;
      return { ...withXp, current: next };
    });
  };

  /* ---------------- STATE 2: lock the bridge ---------------- */
  const lockBridge = () => {
    if (wordCount(draft) < 5) return;
    const first = !drill.awardedBridge;
    setDrill(
      (d) => ({ ...d, bridge: draft.trim(), locked: true, phase: "monkey", awardedBridge: true }),
      (prev, d) => {
        if (!first) return prev;
        if (d.xpMode === "repeat") {
          flash("+1 XP (seen before)");
          return addXp(prev, 1);
        }
        if (d.xpMode === "none") return prev;
        flash("+5 XP — bridge locked");
        return addXp(prev, 5);
      },
    );
  };

  /* ---------------- STATE 3: the monkey test ---------------- */
  const judge = (label: string, j: Judgment) => {
    const already = drill.awardedJudged.includes(label);
    setDrill(
      (d) => {
        const judgments = { ...d.judgments, [label]: j };
        const nextIndex = d.monkeyIndex + 1;
        const done = nextIndex >= q.choices.length;
        const works = Object.values(judgments).filter((v) => v === "works").length;
        const survivors = Object.values(judgments).filter((v) => v === "works" || v === "kind").length;
        const verdict: Drill["verdict"] = !done
          ? null
          : works === 0
            ? "rewrite"
            : survivors >= 2
              ? "loose"
              : "clean";
        return {
          ...d,
          judgments,
          monkeyIndex: nextIndex,
          awardedJudged: already ? d.awardedJudged : [...d.awardedJudged, label],
          phase: done ? "verdict" : "monkey",
          verdict,
        };
      },
      (prev, d) => (already ? prev : grant(prev, d, 1)),
    );
  };

  /* ---------------- STATE 4: repair the bridge ---------------- */
  const reopenBridge = () => {
    setDraft(drill.bridge);
    setDrill((d) => ({
      ...d,
      locked: false,
      phase: "stem",
      judgments: {},
      monkeyIndex: 0,
      verdict: null,
    }));
  };

  /* ---------------- STATE 5: final answer ---------------- */
  const answer = (label: string | null) => {
    const isCorrect = label !== null && label === q.correct;
    update((prev) => {
      const d = prev.current!;
      let next = prev;
      let streak = prev.streak;
      if (isCorrect) {
        streak = prev.streak + 1;
        if (!d.awardedFinal && d.xpMode === "full") next = addXp(next, 3);
        if (streak % 5 === 0) next = addXp(next, 5);
      } else {
        streak = 0;
      }
      return {
        ...next,
        streak,
        current: {
          ...d,
          finalChoice: label,
          blank: label === null,
          correct: isCorrect,
          awardedFinal: isCorrect ? true : d.awardedFinal,
          phase: "feedback",
        },
      };
    });
    if (isCorrect) flash("Correct! +3 XP");
  };

  /* ---------------- STATE 6: acknowledge the correction ---------------- */
  const acknowledge = () => {
    update((prev) => {
      const d = prev.current!;
      let next = prev;
      if (!d.awardedFinal && d.xpMode === "full") next = addXp(next, 3);
      return { ...next, current: { ...d, ackCorrection: true, awardedFinal: true } };
    });
    flash("+3 XP — correction complete");
  };

  /* ---------------- STATE 7: next ---------------- */
  const finish = (goHome: boolean) => {
    update((prev) => {
      const d = prev.current!;
      const completedCount = prev.completedCount + 1;
      const cycle = prev.recent.includes(d.qid) ? prev.recent : [...prev.recent, d.qid];
      let next: ProfileState = {
        ...prev,
        completedCount,
        seenAt: { ...prev.seenAt, [d.qid]: completedCount },
        recent: cycle.length >= QUESTIONS.length ? [d.qid] : cycle,
        current: null,
      };
      next = setDay(next, { completed: dayOf(next).completed + 1 });
      next = maybeDayBonus(next);
      if (!goHome) next = { ...next, current: newDrill(next) };
      return next;
    });
    setDraft("");
    if (goHome) navigate({ to: "/dashboard/$pid", params: { pid: id } });
  };

  const currentChoice = q.choices[drill.monkeyIndex];
  const correctChoice = q.choices.find((c) => c.label === q.correct)!;

  return (
    <main className="relative min-h-screen px-5 py-6 sm:px-8">
      <DoodleField />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-primary px-6 py-3 text-lg font-extrabold text-primary-foreground shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-4xl space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <BouncyTap
            onClick={() => navigate({ to: "/dashboard/$pid", params: { pid: id } })}
            className="border border-border px-5 py-3 text-base"
          >
            ← Dashboard
          </BouncyTap>
          <div className="text-right">
            <div className="text-2xl font-extrabold" style={{ color: meta.accent }}>
              {p.availableXp} XP
            </div>
            <div className="text-sm text-muted-foreground">Streak {p.streak} 🔥</div>
          </div>
        </div>

        {/* STEM */}
        <section className="quest-card relative overflow-hidden p-7 text-center">
          <Flower className="-left-4 -top-3" size={92} rotate={-16} opacity={0.2} variant={0} />
          <Flower className="-right-4 bottom-0" size={80} rotate={20} opacity={0.16} variant={2} />
          <FamilyBadge family={q.family} />
          <h1 className="stem-type mt-5 text-[48px] leading-tight sm:text-[60px]">{q.stem} ::</h1>
        </section>

        {/* Locked bridge */}
        {drill.locked && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="quest-card flex items-start gap-3 p-6"
          >
            <span className="text-3xl" aria-hidden="true">
              🔒
            </span>
            <p className="text-[30px] leading-snug">{drill.bridge}</p>
          </motion.div>
        )}

        {/* STATE 1 + 2 */}
        {drill.phase === "stem" && (
          <section className="quest-card space-y-4 p-7">
            <h2 className="text-2xl font-extrabold">
              Write your bridge sentence — how do these two words connect?
            </h2>
            <p className="text-base text-muted-foreground">Tap the mic on the keyboard to dictate.</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="A glove is worn on a hand…"
              className="w-full rounded-3xl border border-border bg-secondary/50 p-5 text-[26px] leading-snug outline-none focus:border-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-base text-muted-foreground">
                {wordCount(draft)} / 5 words minimum
              </span>
              <BouncyTap
                onClick={lockBridge}
                disabled={wordCount(draft) < 5}
                className="glow-pink bg-primary px-8 py-4 text-2xl text-primary-foreground"
              >
                🔒 Lock My Bridge
              </BouncyTap>
            </div>
          </section>
        )}

        {/* STATE 3 — monkey test, one choice at a time */}
        {drill.phase === "monkey" && currentChoice && (
          <AnimatePresence mode="wait">
            <motion.section
              key={currentChoice.label}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="quest-card space-y-5 p-7"
            >
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Monkey test — choice {drill.monkeyIndex + 1} of {q.choices.length}
              </p>
              <p className="stem-type text-[36px]">
                ({currentChoice.label}) {currentChoice.pair}
              </p>
              <p className="rounded-3xl bg-secondary/50 p-5 text-[30px] leading-snug">
                {monkeySwap(drill.bridge, q.stem, currentChoice.pair)}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <BouncyTap
                  onClick={() => judge(currentChoice.label, "works")}
                  className="bg-[#22C55E]/20 py-5 text-2xl text-[#22C55E] ring-1 ring-[#22C55E]/40"
                >
                  Works
                </BouncyTap>
                <BouncyTap
                  onClick={() => judge(currentChoice.label, "kind")}
                  className="bg-[#FACC15]/20 py-5 text-2xl text-[#FACC15] ring-1 ring-[#FACC15]/40"
                >
                  Kind of
                </BouncyTap>
                <BouncyTap
                  onClick={() => judge(currentChoice.label, "no")}
                  className="bg-[#EF4444]/20 py-5 text-2xl text-[#EF4444] ring-1 ring-[#EF4444]/40"
                >
                  Doesn't work
                </BouncyTap>
              </div>
            </motion.section>
          </AnimatePresence>
        )}

        {/* STATE 4 — survivor verdict */}
        {drill.phase === "verdict" && (
          <motion.section
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className="quest-card space-y-4 p-7 text-center"
          >
            {drill.verdict === "clean" && (
              <>
                <h2 className="stem-type text-4xl text-[#22C55E]">One clean survivor!</h2>
                <p className="text-lg text-muted-foreground">Your bridge held. Time to answer.</p>
                <BouncyTap
                  onClick={() => setDrill((d) => ({ ...d, phase: "final" }))}
                  className="glow-pink bg-primary px-8 py-4 text-2xl text-primary-foreground"
                >
                  Choose my answer →
                </BouncyTap>
              </>
            )}
            {drill.verdict === "rewrite" && (
              <>
                <h2 className="stem-type text-4xl text-[#EF4444]">REWRITE</h2>
                <p className="text-lg">
                  None of the choices fit your sentence. Return to the stem and repair your bridge.
                </p>
                <BouncyTap onClick={reopenBridge} className="bg-primary px-8 py-4 text-2xl text-primary-foreground">
                  Repair my bridge
                </BouncyTap>
              </>
            )}
            {drill.verdict === "loose" && (
              <>
                <h2 className="stem-type text-4xl text-[#FACC15]">TOO LOOSE</h2>
                <p className="text-lg">
                  Your bridge let more than one answer through. Find the broad word and tighten it.
                </p>
                <BouncyTap onClick={reopenBridge} className="bg-primary px-8 py-4 text-2xl text-primary-foreground">
                  Tighten my bridge
                </BouncyTap>
              </>
            )}
          </motion.section>
        )}

        {/* STATE 5 — final answer */}
        {drill.phase === "final" && (
          <section className="quest-card space-y-3 p-7">
            <h2 className="text-2xl font-extrabold">Your final answer</h2>
            {q.choices.map((c) => (
              <BouncyTap
                key={c.label}
                onClick={() => answer(c.label)}
                className="block w-full border border-border bg-secondary/40 px-6 py-5 text-left text-[34px] font-bold"
              >
                <span className="text-primary">({c.label})</span> {c.pair}
              </BouncyTap>
            ))}
            <BouncyTap
              onClick={() => answer(null)}
              className="w-full border border-border px-6 py-4 text-xl text-muted-foreground"
            >
              Leave blank
            </BouncyTap>
          </section>
        )}

        {/* STATE 6 — feedback */}
        {drill.phase === "feedback" && (
          <section className="quest-card space-y-5 p-7">
            <h2 className="stem-type text-4xl" style={{ color: drill.correct ? "#22C55E" : "#EF4444" }}>
              {drill.correct ? "Correct!" : drill.blank ? "Left blank" : "Not this time"}
            </h2>
            <div className="rounded-3xl bg-secondary/50 p-5">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">The target bridge</p>
              <p className="mt-2 text-[30px] leading-snug">{q.bridge}</p>
            </div>
            <p className="text-2xl font-extrabold">
              Answer: <span className="text-[#22C55E]">({q.correct}) {correctChoice.pair}</span>
            </p>
            <ul className="space-y-2">
              {q.choices.map((c) => {
                const isCorrect = c.label === q.correct;
                const tempting = !isCorrect && c.label === drill.finalChoice;
                return (
                  <li
                    key={c.label}
                    className="rounded-2xl border p-4 text-lg"
                    style={{
                      borderColor: isCorrect ? "#22C55E" : tempting ? "#FACC15" : "var(--border)",
                      backgroundColor: isCorrect ? "#22C55E1f" : tempting ? "#FACC151a" : "transparent",
                    }}
                  >
                    <span className="font-extrabold">({c.label}) {c.pair}</span>
                    {tempting && <span className="ml-2 font-bold text-[#FACC15]">tempting distractor</span>}
                    <p className="text-muted-foreground">{c.why}</p>
                  </li>
                );
              })}
            </ul>

            {!drill.correct && !drill.ackCorrection && (
              <BouncyTap
                onClick={acknowledge}
                className="w-full bg-primary py-5 text-2xl text-primary-foreground"
              >
                What my bridge needed: “{q.bridge}”
              </BouncyTap>
            )}

            {(drill.correct || drill.ackCorrection) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <BouncyTap
                  onClick={() => finish(false)}
                  className="glow-pink bg-primary py-5 text-2xl text-primary-foreground"
                >
                  Keep practicing
                </BouncyTap>
                <BouncyTap onClick={() => finish(true)} className="border border-border py-5 text-2xl">
                  Stop for now
                </BouncyTap>
              </div>
            )}
          </section>
        )}
      </div>

      <AnimatePresence>
        {showBreak && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-accent px-6 py-4 text-lg font-bold shadow-xl"
          >
            Nice work! Stretch break?
            <BouncyTap
              onClick={() => {
                setShowBreak(false);
                sessionStart.current = Date.now();
              }}
              className="bg-primary px-5 py-2 text-primary-foreground"
            >
              Dismiss
            </BouncyTap>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
