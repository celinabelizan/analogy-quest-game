import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VOCAB_QUESTIONS,
  VOCAB_WORDS,
  type VocabQuestion,
  type VocabQuestionType,
} from "@/data/vocab-system";
import {
  PROFILES,
  TEST_PROFILE,
  type ProfileId,
  type WordMastery,
  useProfile,
  addXp,
  dayOf,
  setDay,
} from "@/lib/quest-store";
import { answerWord, emptyMastery, pickNextQuestion, TYPE_XP } from "@/lib/vocab-mastery";
import { BouncyTap } from "@/components/quest/Doodles";
import { Confetti } from "@/components/quest/Progress";
import { ChildProfileBoundary } from "@/components/sync/ChildProfileBoundary";
import { recordXpEvidenceIfActive } from "@/lib/sync/evidence";

export const Route = createFileRoute("/vocab/$pid")({ component: VocabRoute });
export const VOCAB_DAILY_GOAL = 20;

function VocabRoute() {
  const { pid } = useParams({ from: "/vocab/$pid" });
  const id = (pid === "calista" ? "calista" : pid === "test" ? "test" : "bianca") as ProfileId;
  return (
    <ChildProfileBoundary requestedProfileId={id}>
      <VocabDrill />
    </ChildProfileBoundary>
  );
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function pickNext(
  mastery: Record<string, WordMastery>,
  lastQuestionId: string | null,
): VocabQuestion {
  return pickNextQuestion(VOCAB_WORDS, VOCAB_QUESTIONS, mastery, lastQuestionId);
}

function VocabDrill() {
  const { pid } = useParams({ from: "/vocab/$pid" });
  const id = (pid === "calista" ? "calista" : pid === "test" ? "test" : "bianca") as ProfileId;
  const meta = [...PROFILES, TEST_PROFILE].find((p) => p.id === id)!;
  const [profile, update] = useProfile(id);
  const mastery = useMemo(() => profile.wordMastery ?? {}, [profile.wordMastery]);
  const today = dayOf(profile);
  const done = today.vocabDone ?? 0;
  const [question, setQuestion] = useState(() => pickNext(mastery, null));
  const [syncAttemptId, setSyncAttemptId] = useState(() => crypto.randomUUID());
  const [choices, setChoices] = useState(() => question.choices);
  const [picked, setPicked] = useState<string | null>(null);
  const [nextMastery, setNextMastery] = useState<Record<string, WordMastery> | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const word = VOCAB_WORDS.find((entry) => entry.id === question.vocabId)!;
  const state = mastery[word.id] ?? emptyMastery(word.id);
  const answered = picked !== null;
  const right = picked === question.correctChoiceId;

  const stageLabel = state.masteredBonusAwarded
    ? "Mastered"
    : (["New", "Recognize", "Connect", "Apply"][state.masteryStage] ?? "Apply");
  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  // Keep SSR/client output identical, then randomize once the interactive page mounts.
  useEffect(() => setChoices(shuffled(question.choices)), [question.choices, question.id]);

  const choose = (choiceId: string) => {
    if (answered) return;
    setPicked(choiceId);
    const correct = choiceId === question.correctChoiceId;
    let awarded = 0;
    update((prev) => {
      let next = { ...prev };
      const allMastery = { ...(prev.wordMastery ?? {}) };
      const before = allMastery[word.id] ?? emptyMastery(word.id);
      const after = answerWord(before, question.type, correct);
      if (correct) {
        awarded = TYPE_XP[question.type];
        if (
          question.type === "context" &&
          after.contextScore >= 2 &&
          !before.masteredBonusAwarded
        ) {
          awarded += 10;
          after.masteredBonusAwarded = true;
        }
        next = addXp(next, awarded);
      }
      allMastery[word.id] = after;
      setNextMastery(allMastery);
      const day = dayOf(next);
      const newDone = (day.vocabDone ?? 0) + 1;
      let vocabBonus = day.vocabBonus ?? false;
      if (newDone === VOCAB_DAILY_GOAL && !vocabBonus) {
        vocabBonus = true;
        next = addXp(next, 15);
      }
      next = setDay(next, { vocabDone: newDone, vocabBonus });
      return { ...next, wordMastery: allMastery };
    });
    void recordXpEvidenceIfActive({
      localProfileId: id,
      attemptId: syncAttemptId,
      evidenceKind: "vocab_answer",
      contentId: question.id,
      payload: { choice: choiceId },
    });
    if (correct) {
      setBurst((value) => value + 1);
      flash(
        `+${awarded || TYPE_XP[question.type]} XP${awarded > TYPE_XP[question.type] ? " — word mastered!" : ""}`,
      );
    }
  };

  const nextWord = () => {
    const next = pickNext(nextMastery ?? profile.wordMastery ?? {}, question.id);
    setQuestion(next);
    setSyncAttemptId(crypto.randomUUID());
    setChoices(shuffled(next.choices));
    setPicked(null);
    setNextMastery(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mastered = useMemo(
    () => Object.values(mastery).filter((entry) => entry.masteredBonusAwarded).length,
    [mastery],
  );
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
          ← {meta.name}'s dashboard
        </Link>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {mastered} mastered
        </span>
      </header>
      <section className="quest-card mb-5 space-y-2 p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>
            Today's words: {done} / {VOCAB_DAILY_GOAL}
          </span>
          <span>{stageLabel}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary/40">
          <motion.div animate={{ width: `${pct}%` }} className="h-full rounded-full bg-primary" />
        </div>
      </section>
      <section className="quest-card space-y-4 p-7">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {word.word.toUpperCase()}
          </h1>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase">
            {question.type}
          </span>
        </div>
        {word.root && (
          <p className="text-base text-muted-foreground">
            🔑 Root: <b>{word.root}</b> = {word.rootMeaning}
          </p>
        )}
        <h2 className="text-xl font-bold">{question.ask}</h2>
        <div className="space-y-2">
          {choices.map((choice, index) => {
            const isPicked = picked === choice.id;
            const isCorrect = choice.id === question.correctChoiceId;
            const show = answered && (isPicked || isCorrect);
            return (
              <div key={choice.id}>
                <BouncyTap
                  onClick={() => choose(choice.id)}
                  className={`w-full border px-4 py-3 text-left text-base ${!answered ? "border-border" : isCorrect ? "border-green-600 bg-green-600/10" : isPicked ? "border-destructive bg-destructive/10" : "border-border opacity-50"}`}
                >
                  <b>({String.fromCharCode(65 + index)})</b> {choice.text}
                </BouncyTap>
                {show && (
                  <p
                    className={`mt-1 px-2 text-sm ${isCorrect ? "text-green-700" : "text-destructive"}`}
                  >
                    {choice.why}
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
            This word will return soon. Read the explanation, then beat it next time.
          </p>
        )}
      </section>
    </main>
  );
}
