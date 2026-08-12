import type { VocabQuestion, VocabQuestionType, VocabWord } from "@/data/vocab-system";
import type { WordMastery } from "@/lib/quest-store";

const DAY = 86_400_000;
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];
const STAGE_TYPE: Record<number, VocabQuestionType> = { 0: "definition", 1: "definition", 2: "synonym", 3: "context" };

export const TYPE_XP: Record<VocabQuestionType, number> = { definition: 2, synonym: 3, context: 4 };

export const emptyMastery = (vocabId: string): WordMastery => ({
  vocabId, masteryStage: 0, correctStreak: 0, incorrectCount: 0, lastSeen: "", nextReview: "",
  definitionScore: 0, synonymScore: 0, antonymScore: 0, contextScore: 0,
  distinctionScore: 0, recallScore: 0,
});

export function pickNextQuestion(
  words: VocabWord[],
  questions: VocabQuestion[],
  mastery: Record<string, WordMastery>,
  lastQuestionId: string | null,
  now = Date.now(),
): VocabQuestion {
  const questionsFor = (vocabId: string, stage: number) =>
    questions.filter((q) => q.vocabId === vocabId && q.type === (STAGE_TYPE[stage] ?? "context"));
  const due = words
    .map((word) => ({ word, state: mastery[word.id] }))
    .filter(({ state }) => state && (!state.nextReview || Date.parse(state.nextReview) <= now))
    .sort((a, b) => Date.parse(a.state!.nextReview || "1970-01-01") - Date.parse(b.state!.nextReview || "1970-01-01"));
  const unseen = words.filter((word) => !mastery[word.id]);
  const fallback = [...words].sort((a, b) => Date.parse(mastery[a.id]?.lastSeen || "1970-01-01") - Date.parse(mastery[b.id]?.lastSeen || "1970-01-01"));
  const word = due[0]?.word ?? unseen[0] ?? fallback[0]!;
  const candidates = questionsFor(word.id, mastery[word.id]?.masteryStage ?? 0).filter((q) => q.id !== lastQuestionId);
  return candidates[0] ?? questions.find((q) => q.vocabId === word.id)!;
}

export function answerWord(
  state: WordMastery,
  type: VocabQuestionType,
  correct: boolean,
  now = Date.now(),
): WordMastery {
  const scoreKey = `${type}Score` as "definitionScore" | "synonymScore" | "contextScore";
  if (!correct) return {
    ...state,
    masteryStage: Math.max(0, state.masteryStage - 1) as WordMastery["masteryStage"],
    correctStreak: 0,
    incorrectCount: state.incorrectCount + 1,
    lastSeen: new Date(now).toISOString(),
    nextReview: new Date(now + 10 * 60_000).toISOString(),
  };
  const streak = state.correctStreak + 1;
  const nextStage = Math.min(3, state.masteryStage + (streak >= 2 ? 1 : 0)) as WordMastery["masteryStage"];
  return {
    ...state,
    [scoreKey]: state[scoreKey] + 1,
    masteryStage: nextStage,
    correctStreak: streak >= 2 ? 0 : streak,
    lastSeen: new Date(now).toISOString(),
    nextReview: new Date(now + REVIEW_INTERVALS[nextStage]! * DAY).toISOString(),
  };
}
