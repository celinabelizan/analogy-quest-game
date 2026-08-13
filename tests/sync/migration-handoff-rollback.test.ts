import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { materializeCloudRollback, readProfile, writeProfile } from "../../src/lib/quest-store";
import { buildMigrationCandidate } from "../../src/lib/sync/migration";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("migration handoff and local-only rollback", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: new MemoryStorage(), dispatchEvent: () => true },
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: window.localStorage,
      configurable: true,
    });
  });

  it("keeps cutover-day and following-LA-day counts and claims in disjoint buckets", () => {
    const raw = {
      "ssatquest.v8.shared": JSON.stringify({ showRewards: true }),
      "ssatquest.v8.profile.test": JSON.stringify({
        lifetimeXp: 200,
        availableXp: 200,
        rewards: [],
        redemptions: [],
        history: [],
        wordMastery: {},
        days: {
          "2026-08-12": { completed: 1, exitTicket: true, vocabDone: 2 },
          "2026-08-13": { completed: 2, dayBonus: true, vocabDone: 3, vocabBonus: true },
        },
        familyCalendarMigration: {
          version: 1,
          cutoverAt: "2026-08-13T06:30:00.000Z",
          legacyUtcDate: "2026-08-13",
          familyDate: "2026-08-12",
          legacyDayRebased: true,
          overlappingLegacyDay: { completed: 3, exitTicket: true, vocabDone: 7 },
        },
      }),
    };
    const candidate = buildMigrationCandidate(raw, "test");
    expect(candidate.dailyProgressFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyLocalDate: "2026-08-12",
          analogyCompleted: 4,
          vocabDone: 9,
        }),
        expect.objectContaining({
          familyLocalDate: "2026-08-13",
          analogyCompleted: 2,
          vocabDone: 3,
        }),
      ]),
    );
    expect(candidate.overlappingDailyClaims).toEqual(
      expect.arrayContaining([
        { familyLocalDate: "2026-08-12", awardKind: "exit_ticket" },
        { familyLocalDate: "2026-08-13", awardKind: "analogy_day_bonus" },
        { familyLocalDate: "2026-08-13", awardKind: "vocab_day_bonus" },
      ]),
    );
  });

  it("persists capture before upload, resumes it after reload, locks cutover, and archives rollback", () => {
    const runtime = readFileSync(resolve(process.cwd(), "src/lib/sync/runtime.ts"), "utf8");
    const indexedDb = readFileSync(resolve(process.cwd(), "src/lib/sync/indexed-db.ts"), "utf8");
    expect(indexedDb).toContain("const DB_VERSION = 3");
    expect(indexedDb).toContain('const MIGRATION_CAPTURES = "migration-captures"');
    expect(runtime.indexOf("await putMigrationCaptureDraft(draft)")).toBeLessThan(
      runtime.indexOf('invoke("migration-backup-upload"'),
    );
    expect(runtime).toContain('in("status", ["requested", "captured"])');
    expect(runtime).toContain("migrationCutoverLocked: Boolean");
    expect(runtime).toContain("listRewardWithdrawals()");
    expect(runtime).toContain("listPendingImages()");
    expect(runtime).toContain("rollback-cloud-archive");
  });

  it("materializes cloud domains without replacing analogy or Vocabulary V1 learning state", () => {
    writeProfile("test", {
      lifetimeXp: 17,
      availableXp: 12,
      streak: 4,
      activeRewardId: null,
      redemptions: [],
      seenAt: { q1: 2 },
      completedCount: 1,
      recent: ["q1"],
      days: { "2026-08-12": { completed: 1, exitTicket: false, dayBonus: false } },
      current: null,
      history: [
        {
          qid: "q1",
          at: 1,
          stem: "a:b",
          family: "kind",
          familyGuess: null,
          familyRight: true,
          choice: "c",
          correctChoice: "c",
          correct: true,
          rewrites: 0,
          peeked: false,
          stuckOnWord: false,
        },
      ],
      wordMastery: {
        word: {
          vocabId: "word",
          masteryStage: 2,
          correctStreak: 2,
          incorrectCount: 0,
          lastSeen: "2026-08-12",
          nextReview: "2026-08-13",
          definitionScore: 1,
          synonymScore: 1,
          antonymScore: 0,
          contextScore: 1,
          distinctionScore: 0,
          recallScore: 0,
        },
      },
      vocabMigrationVersion: 1,
    });

    materializeCloudRollback("test", {
      lifetimeXp: 250,
      availableXp: 180,
      approvedRewards: [{ id: "reward-1", name: "Book", xp: 100 }],
      activeRewardId: "reward-1",
      redemptions: [
        {
          id: "redeem-1",
          rewardId: "reward-1",
          name: "Book",
          cost: 100,
          status: "approved",
          requestedAt: "2026-08-12T10:00:00Z",
        },
      ],
      showRewards: true,
    });

    const result = readProfile("test");
    expect(result.availableXp).toBe(180);
    expect(result.lifetimeXp).toBe(250);
    expect(result.activeRewardId).toBe("reward-1");
    expect(result.history?.map((attempt) => attempt.qid)).toEqual(["q1"]);
    expect(result.days["2026-08-12"]?.completed).toBe(1);
    expect(result.wordMastery?.word?.masteryStage).toBe(2);
  });
});
