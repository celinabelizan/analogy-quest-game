import { describe, expect, it } from "vitest";
import {
  calculateAnalogyAward,
  calculateVocabAward,
  familyDayKey,
} from "../../src/lib/sync/xp-rules";

describe("analogy XP evidence", () => {
  const base = {
    questionId: "P1",
    sessionId: "00000000-0000-4000-8000-000000000001",
    difficulty: 1 as const,
    xpMode: "full" as const,
    correctChoiceId: "A",
  };

  it("awards each logical ritual action at most once even when event IDs differ", () => {
    const first = calculateAnalogyAward({
      ...base,
      action: "bridge_locked",
      eventId: "00000000-0000-4000-8000-000000000011",
      previouslyAwardedKeys: [],
    });
    const replayWithNewEventId = calculateAnalogyAward({
      ...base,
      action: "bridge_locked",
      eventId: "00000000-0000-4000-8000-000000000012",
      previouslyAwardedKeys: ["P1:bridge_locked"],
    });

    expect(first).toBe(2);
    expect(replayWithNewEventId).toBe(0);
  });

  it("accepts every distinct wrong-choice discard, including a legitimate extra discard", () => {
    const awardedKeys = ["P1:discard:B", "P1:discard:C", "P1:discard:D"];

    expect(
      calculateAnalogyAward({
        ...base,
        action: "discard",
        choiceId: "E",
        choiceIds: ["A", "B", "C", "D", "E"],
        eventId: "00000000-0000-4000-8000-000000000013",
        previouslyAwardedKeys: awardedKeys,
      }),
    ).toBe(1);
  });

  it("never awards for discarding the correct answer or replaying a discard", () => {
    expect(
      calculateAnalogyAward({
        ...base,
        action: "discard",
        choiceId: "A",
        choiceIds: ["A", "B", "C", "D", "E"],
        eventId: "00000000-0000-4000-8000-000000000015",
        previouslyAwardedKeys: [],
      }),
    ).toBe(0);
    expect(
      calculateAnalogyAward({
        ...base,
        action: "discard",
        choiceId: "B",
        choiceIds: ["A", "B", "C", "D", "E"],
        eventId: "00000000-0000-4000-8000-000000000016",
        previouslyAwardedKeys: ["P1:discard:B"],
      }),
    ).toBe(0);
  });

  it("enforces repeat and ineligible-question ceilings", () => {
    expect(
      calculateAnalogyAward({
        ...base,
        xpMode: "repeat",
        action: "bridge_locked",
        eventId: "00000000-0000-4000-8000-000000000017",
        previouslyAwardedKeys: [],
      }),
    ).toBe(1);
    expect(
      calculateAnalogyAward({
        ...base,
        xpMode: "repeat",
        action: "final_correct",
        eventId: "00000000-0000-4000-8000-000000000018",
        previouslyAwardedKeys: ["P1:bridge_locked"],
      }),
    ).toBe(0);
    expect(
      calculateAnalogyAward({
        ...base,
        xpMode: "none",
        action: "bridge_locked",
        eventId: "00000000-0000-4000-8000-000000000019",
        previouslyAwardedKeys: [],
      }),
    ).toBe(0);
  });

  it("derives amounts from known actions and difficulty, never a client amount", () => {
    const input = {
      ...base,
      difficulty: 3 as const,
      action: "final_correct" as const,
      eventId: "00000000-0000-4000-8000-000000000020",
      previouslyAwardedKeys: [],
      requestedXp: 50_000,
    };

    expect(calculateAnalogyAward(input)).toBe(4);
  });

  it("caps an ordinary five-choice difficulty-1 attempt at the evidence-derived ceiling", () => {
    const awardedKeys: string[] = [];
    const claim = (
      action: "type_correct" | "bridge_locked" | "discard" | "final_correct",
      choiceId?: string,
    ) => {
      const amount = calculateAnalogyAward({
        ...base,
        action,
        choiceId,
        choiceIds: ["A", "B", "C", "D", "E"],
        eventId: crypto.randomUUID(),
        previouslyAwardedKeys: awardedKeys,
      });
      awardedKeys.push(choiceId ? `P1:discard:${choiceId}` : `P1:${action}`);
      return amount;
    };

    const total =
      claim("type_correct") +
      claim("bridge_locked") +
      claim("discard", "B") +
      claim("discard", "C") +
      claim("discard", "D") +
      claim("discard", "E") +
      claim("final_correct");

    expect(total).toBe(9);
    expect(claim("final_correct")).toBe(0);
  });
});

describe("Vocabulary V1 XP evidence", () => {
  it.each([
    ["definition", 2],
    ["synonym", 3],
    ["context", 4],
  ] as const)("awards the existing %s amount", (questionType, expected) => {
    expect(
      calculateVocabAward({
        eventId: crypto.randomUUID(),
        vocabId: "roots-mini-1-abduct",
        questionType,
        correct: true,
        masteryBonusEligible: false,
        dailyBonusEligible: false,
        previouslyAwardedKeys: [],
      }),
    ).toBe(expected);
  });

  it("does not accept a repeated mastery or daily bonus claim", () => {
    expect(
      calculateVocabAward({
        eventId: crypto.randomUUID(),
        vocabId: "roots-mini-1-abduct",
        questionType: "context",
        correct: true,
        masteryBonusEligible: true,
        dailyBonusEligible: true,
        previouslyAwardedKeys: [
          "vocab:roots-mini-1-abduct:mastery_bonus",
          "vocab:2026-11-01:daily_bonus",
        ],
      }),
    ).toBe(4);
  });
});

describe("America/Los_Angeles family-day boundary", () => {
  it("keeps both sides of the UTC date boundary on the same local day", () => {
    expect(familyDayKey("2026-08-13T06:59:59.999Z", "America/Los_Angeles")).toBe("2026-08-12");
    expect(familyDayKey("2026-08-13T07:00:00.000Z", "America/Los_Angeles")).toBe("2026-08-13");
  });

  it("does not create two claim keys across the repeated fall-back hour", () => {
    const beforeFallback = familyDayKey("2026-11-01T08:30:00.000Z", "America/Los_Angeles");
    const afterFallback = familyDayKey("2026-11-01T09:30:00.000Z", "America/Los_Angeles");

    expect(beforeFallback).toBe("2026-11-01");
    expect(afterFallback).toBe(beforeFallback);
  });
});
