import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DoodleField, Flower, BouncyTap } from "@/components/quest/Doodles";
import { FamilyBadge } from "@/components/quest/Bits";
import { ChoiceChecks, Confetti, GoalBar, StepTrail } from "@/components/quest/Progress";
import { FAMILIES, QUESTIONS, type Family, type Question } from "@/data/questions";
import { looseHint, monkeySwap, strictHint, unknownWordSteps, wordCount } from "@/lib/analogy";

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
        content: "Name the bridge type, write your sentence, then discard answer choices one by one.",
      },
      { property: "og:title", content: "Analogy Drill — SSAT Quest" },
      { property: "og:description", content: "Bridge type, your sentence, discard the losers, commit to one answer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Practice,
});

const FAMILY_KEYS = Object.keys(FAMILIES) as Family[];

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
    phase: "type",
    familyGuess: null,
    awardedType: false,
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
  const [showStuck, setShowStuck] = useState(false);
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
    setBurst((n) => n + 1);
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

  /* ---------------- STATE 1: name the bridge type ---------------- */
  const chooseFamily = (f: Family) => {
    const first = !drill.awardedType;
    const right = f === q.family;
    setDrill(
      (d) => ({ ...d, familyGuess: f, awardedType: true, phase: "stem" }),
      (prev, d) => (first && right ? grant(prev, d, 2) : prev),
    );
    flash(right ? "+2 XP — right kind of bridge" : `It's ${FAMILIES[q.family].label}`);
  };

  /* ---------------- STATE 2: lock the sentence ---------------- */
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
        flash("+5 XP — sentence locked");
        return addXp(prev, 5);
      },
    );
  };

  /* ---------------- STATE 3: discard the losers ---------------- */
  const setDiscard = (label: string, out: boolean) => {
    const already = drill.awardedJudged.includes(label);
    const isDiscarded = drill.judgments[label] === "no";
    if (out === isDiscarded) return;
    setDrill(
      (d) => {
        const judgments = { ...d.judgments };
        if (out) judgments[label] = "no" as Judgment;
        else delete judgments[label];
        return {
          ...d,
          judgments,
          monkeyIndex: Object.keys(judgments).length,
          awardedJudged: already || !out ? d.awardedJudged : [...d.awardedJudged, label],
        };
      },
      (prev, d) => (already || !out ? prev : grant(prev, d, 1)),
    );
  };

  /* ---------------- STATE 4: repair the sentence ---------------- */
  const reopenBridge = () => {
    setDraft(drill.bridge);
    setDrill((d) => ({
      ...d,
      locked: false,
      phase: "stem",
      judgments: {},
      monkeyIndex: 0,
      verdict: null,
      rewrites: (d.rewrites ?? 0) + 1,
    }));
  };

  const peekModel = () => {
    setDrill((d) => ({ ...d, peeked: true, stuckOnWord: true }));
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

  const correctChoice = q.choices.find((c) => c.label === q.correct)!;
  const discarded = q.choices.filter((c) => drill.judgments[c.label] === "no");
  const standing = q.choices.filter((c) => drill.judgments[c.label] !== "no");
  const stepIndex =
    drill.phase === "type"
      ? 0
      : drill.phase === "stem"
        ? 1
        : drill.phase === "monkey"
          ? 2
          : drill.phase === "final"
            ? 3
            : 4;
  const today = dayOf(p);

  return (
    <main className="relative min-h-screen px-5 py-6 sm:px-8">
      <DoodleField seed={3} />
      <Confetti fire={burst} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 18 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-primary px-6 py-3 text-lg font-extrabold text-primary-foreground shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-3xl space-y-5 pb-24">
        <div className="flex items-center justify-between">
          <BouncyTap
            onClick={() => navigate({ to: "/dashboard/$pid", params: { pid: id } })}
            className="border border-border px-5 py-3 text-base"
          >
            ← Dashboard
          </BouncyTap>
          <div className="text-right">
            <motion.div
              key={p.availableXp}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
              className="text-2xl font-extrabold"
              style={{ color: meta.accent }}
            >
              {p.availableXp} XP
            </motion.div>
            <div className="text-sm text-muted-foreground">Streak {p.streak} 🔥</div>
          </div>
        </div>

        <GoalBar done={today.completed} goal={5} />
        <StepTrail active={stepIndex} />

        {/* STEM */}
        <section className="quest-card relative overflow-hidden p-7 text-center">
          <Flower className="-right-4 bottom-0" size={80} rotate={20} opacity={0.12} variant={2} />
          {drill.phase !== "type" && <FamilyBadge family={q.family} />}
          <h1 className="stem-type mt-5 text-[48px] leading-tight sm:text-[60px]">{q.stem} ::</h1>
        </section>

        {/* Locked sentence — kept in view while it's the thing being tested */}
        {drill.locked && drill.phase !== "feedback" && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-start gap-3 rounded-3xl border border-border bg-secondary/50 p-5"
          >
            <span className="text-2xl" aria-hidden="true">
              ✓
            </span>
            <p className="text-[26px] leading-snug">{drill.bridge}</p>
          </motion.div>
        )}

        {/* STATE 1 — what kind of bridge is this? */}
        {drill.phase === "type" && (
          <section className="quest-card space-y-4 p-7">
            <h2 className="text-2xl font-extrabold">First: what kind of bridge is this?</h2>
            <p className="text-base text-muted-foreground">
              Name the relationship before you write anything.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FAMILY_KEYS.map((f) => (
                <BouncyTap
                  key={f}
                  onClick={() => chooseFamily(f)}
                  className="w-full border border-border bg-card px-5 py-4 text-left text-xl hover:border-primary"
                >
                  {FAMILIES[f].label}
                </BouncyTap>
              ))}
            </div>
          </section>
        )}

        {/* STATE 2 — write the sentence */}
        {drill.phase === "stem" && (
          <section className="quest-card space-y-4 p-7">
            <h2 className="text-2xl font-extrabold">
              {(drill.rewrites ?? 0) > 0
                ? "Rewrite it — make it fit only this pair"
                : "Now write your bridge sentence — how do these two words connect?"}
            </h2>
            {(drill.rewrites ?? 0) > 0 && (
              <p className="rounded-3xl bg-secondary/50 p-4 text-lg">
                {looseHint(q.stem, FAMILIES[q.family].label, standing.length || 2, (drill.rewrites ?? 1) - 1)}
              </p>
            )}
            <p className="text-base text-muted-foreground">
              Use both stem words. Tap the mic on the keyboard to dictate.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
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
                🔒 Lock My Sentence
              </BouncyTap>
            </div>

            {/* Don't know one of the words? */}
            <BouncyTap
              onClick={() => setShowStuck((s) => !s)}
              className="border border-border px-5 py-3 text-base text-muted-foreground"
            >
              I don't know one of these words
            </BouncyTap>
            {showStuck && (
              <div className="space-y-3 rounded-3xl border border-border bg-secondary/40 p-5">
                <p className="text-lg font-extrabold">That's okay — do it in this order:</p>
                <ol className="space-y-2 text-base">
                  {unknownWordSteps(q.stem).map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-extrabold text-primary">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                {drill.peeked ? (
                  <p className="rounded-2xl bg-card p-4 text-[22px] leading-snug">{q.bridge}</p>
                ) : (
                  <BouncyTap onClick={peekModel} className="border border-border px-5 py-3 text-base">
                    Show me a model sentence
                  </BouncyTap>
                )}
              </div>
            )}
          </section>
        )}


        {/* STATE 3 — all five choices, discard one by one */}
        {drill.phase === "monkey" && (
          <section className="quest-card space-y-4 p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Discard the ones your sentence rejects
              </p>
              <ChoiceChecks total={q.choices.length} done={discarded.length} />
            </div>

            <ul className="space-y-3">
              {q.choices.map((c) => {
                const out = drill.judgments[c.label] === "no";
                return (
                  <motion.li
                    key={c.label}
                    animate={{ opacity: out ? 0.45 : 1 }}
                    className="rounded-3xl border border-border p-5"
                  >
                    <p className={`stem-type text-[30px] ${out ? "line-through" : ""}`}>
                      ({c.label}) {c.pair}
                    </p>
                    <p className={`mt-2 text-[24px] leading-snug ${out ? "line-through opacity-70" : ""}`}>
                      {monkeySwap(drill.bridge, q.stem, c.pair)}
                    </p>
                    <BouncyTap
                      onClick={() => toggleDiscard(c.label)}
                      className={`mt-3 border px-5 py-3 text-lg ${
                        out ? "border-border text-muted-foreground" : "border-border hover:border-primary"
                      }`}
                    >
                      {out ? "↩ Put it back" : "✕ Doesn't fit — discard"}
                    </BouncyTap>
                  </motion.li>
                );
              })}
            </ul>

            {/* live guidance */}
            {standing.length === 1 && (
              <div className="space-y-3 rounded-3xl border p-5 text-center" style={{ borderColor: "var(--success)" }}>
                <p className="script-type text-4xl text-success">One survivor!</p>
                <p className="text-lg text-muted-foreground">Your sentence did its job.</p>
                <BouncyTap
                  onClick={() => setDrill((d) => ({ ...d, phase: "final", verdict: "clean" }))}
                  className="glow-pink bg-primary px-8 py-4 text-2xl text-primary-foreground"
                >
                  Choose my answer →
                </BouncyTap>
              </div>
            )}
            {standing.length > 1 && (
              <div className="space-y-3 rounded-3xl border border-border bg-secondary/40 p-5 text-center">
                <p className="text-xl font-extrabold">
                  {standing.length} still standing — your sentence is too loose.
                </p>
                <p className="text-base text-muted-foreground">
                  Add the detail that only the stem pair has: how, why, or how much. Then re-test.
                </p>
                <BouncyTap onClick={reopenBridge} className="border border-border px-6 py-3 text-lg">
                  Build a stronger sentence
                </BouncyTap>
              </div>
            )}
            {standing.length === 0 && (
              <div className="space-y-3 rounded-3xl border p-5 text-center" style={{ borderColor: "var(--warn)" }}>
                <p className="text-xl font-extrabold text-warn">You discarded everything.</p>
                <p className="text-base text-muted-foreground">
                  Your sentence is too strict — loosen one word and test again.
                </p>
                <BouncyTap onClick={reopenBridge} className="border border-border px-6 py-3 text-lg">
                  Rewrite my sentence
                </BouncyTap>
              </div>
            )}
          </section>
        )}

        {/* STATE 4 — final answer */}
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

        {/* STATE 5 — feedback */}
        {drill.phase === "feedback" && (
          <section className="quest-card space-y-5 p-7">
            <h2 className="script-type text-5xl" style={{ color: drill.correct ? "var(--success)" : "var(--danger)" }}>
              {drill.correct ? "Correct!" : drill.blank ? "Left blank" : "Not this time"}
            </h2>
            <div className="rounded-3xl bg-secondary/50 p-5">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">The target bridge</p>
              <p className="mt-2 text-[30px] leading-snug">{q.bridge}</p>
            </div>
            <p className="text-2xl font-extrabold">
              Answer: <span className="text-success">({q.correct}) {correctChoice.pair}</span>
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
                      borderColor: isCorrect ? "var(--success)" : "var(--border)",
                      backgroundColor: isCorrect
                        ? "color-mix(in oklab, var(--success) 10%, transparent)"
                        : "transparent",
                    }}
                  >
                    <span className="font-extrabold">({c.label}) {c.pair}</span>
                    {tempting && <span className="ml-2 font-bold text-muted-foreground">your pick</span>}
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
                What my sentence needed: “{q.bridge}”
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
