type AnalogyInput = {
  questionId: string;
  difficulty: 1 | 2 | 3;
  xpMode: "full" | "repeat" | "none";
  action: "type_correct" | "bridge_locked" | "discard" | "final_correct";
  correctChoiceId: string;
  choiceId?: string;
  choiceIds?: string[];
  previouslyAwardedKeys: string[];
};

export function calculateAnalogyAward(input: AnalogyInput): number {
  if (input.xpMode === "none") return 0;
  const key =
    input.action === "discard"
      ? `${input.questionId}:discard:${input.choiceId}`
      : `${input.questionId}:${input.action}`;
  if (input.previouslyAwardedKeys.includes(key)) return 0;
  if (input.xpMode === "repeat") return input.action === "bridge_locked" ? 1 : 0;
  if (
    input.action === "discard" &&
    (!input.choiceId ||
      input.choiceId === input.correctChoiceId ||
      !input.choiceIds?.includes(input.choiceId))
  )
    return 0;
  const base = input.action === "bridge_locked" || input.action === "final_correct" ? 2 : 1;
  return Math.round(base * ({ 1: 1, 2: 1.5, 3: 2 } as const)[input.difficulty]);
}

export function calculateVocabAward(input: {
  vocabId: string;
  questionType: "definition" | "synonym" | "context";
  correct: boolean;
  masteryBonusEligible: boolean;
  dailyBonusEligible: boolean;
  previouslyAwardedKeys: string[];
}) {
  if (!input.correct) return 0;
  let amount = ({ definition: 2, synonym: 3, context: 4 } as const)[input.questionType];
  if (
    input.masteryBonusEligible &&
    !input.previouslyAwardedKeys.includes(`vocab:${input.vocabId}:mastery_bonus`)
  )
    amount += 10;
  // The daily key is server/family-day derived. A prior daily bonus blocks any client eligibility claim.
  if (
    input.dailyBonusEligible &&
    !input.previouslyAwardedKeys.some((key) => /^vocab:\d{4}-\d{2}-\d{2}:daily_bonus$/.test(key))
  )
    amount += 15;
  return amount;
}

export function familyDayKey(instant: string | Date, timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
