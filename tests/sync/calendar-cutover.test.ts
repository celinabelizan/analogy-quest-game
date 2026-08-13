import { describe, expect, it } from "vitest";
import { dayOf, setDay, type ProfileState } from "../../src/lib/quest-store";

const profile: ProfileState = {
  lifetimeXp: 220,
  availableXp: 220,
  streak: 0,
  activeRewardId: null,
  redemptions: [],
  seenAt: {},
  completedCount: 3,
  recent: [],
  days: {
    "2026-08-13": {
      completed: 3,
      exitTicket: true,
      dayBonus: false,
      vocabDone: 7,
      vocabBonus: false,
    },
  },
  current: null,
  familyCalendarMigration: {
    version: 1,
    cutoverAt: "2026-08-13T06:30:00.000Z",
    legacyUtcDate: "2026-08-13",
    familyDate: "2026-08-12",
    overlappingLegacyDay: {
      completed: 3,
      exitTicket: true,
      dayBonus: false,
      vocabDone: 7,
      vocabBonus: false,
    },
  },
};

describe("UTC to America/Los_Angeles local cache cutover", () => {
  it("preserves the old raw day on the cutover date without carrying it into tomorrow", () => {
    expect(dayOf(profile, "2026-08-12")).toMatchObject({
      completed: 3,
      exitTicket: true,
      vocabDone: 7,
    });
    expect(dayOf(profile, "2026-08-13")).toMatchObject({
      completed: 0,
      exitTicket: false,
      vocabDone: 0,
    });
  });

  it("starts the following LA day clean while retaining a recoverable overlap snapshot", () => {
    const updated = setDay(profile, { completed: 1 }, "2026-08-13");
    expect(dayOf(updated, "2026-08-13").completed).toBe(1);
    expect(updated.familyCalendarMigration?.overlappingLegacyDay?.completed).toBe(3);
    expect(updated.familyCalendarMigration?.legacyDayRebased).toBe(true);
  });
});
