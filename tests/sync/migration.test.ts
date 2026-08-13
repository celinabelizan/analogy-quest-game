import { describe, expect, it } from "vitest";
import {
  buildMigrationCandidate,
  captureRawV8Backup,
  reconcilePhase1,
} from "../../src/lib/sync/migration";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
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

describe("raw v8 migration backup", () => {
  it("captures the exact strings before any normalizer can rerun the fresh-start migration", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({
      dataVersion: 1,
      lifetimeXp: 200,
      availableXp: 200,
      activeRewardId: null,
      redemptions: [],
      seenAt: {},
      completedCount: 0,
      recent: [],
      days: {},
      current: null,
    });
    storage.setItem("ssatquest.v8.profile.bianca", raw);

    const backup = captureRawV8Backup(storage);

    expect(backup.values["ssatquest.v8.profile.bianca"]).toBe(raw);
    expect(storage.getItem("ssatquest.v8.profile.bianca")).toBe(raw);
  });

  it("imports the existing one-time 200 XP exactly once, never as 200 + 200", () => {
    const backup = {
      capturedAt: "2026-08-12T20:00:00.000Z",
      values: {
        "ssatquest.v8.profile.bianca": JSON.stringify({
          dataVersion: 1,
          lifetimeXp: 200,
          availableXp: 200,
          activeRewardId: null,
          redemptions: [],
          seenAt: {},
          completedCount: 0,
          recent: [],
          days: {},
          current: null,
        }),
      },
    };

    const first = buildMigrationCandidate(backup, {
      profileSlug: "bianca",
      migrationId: "40000000-0000-4000-8000-000000000001",
    });
    const retry = buildMigrationCandidate(backup, {
      profileSlug: "bianca",
      migrationId: "40000000-0000-4000-8000-000000000001",
    });

    expect(first.lifetimeXp).toBe(200);
    expect(first.availableXp).toBe(200);
    expect(first.migrationCredit).toBe(200);
    expect(retry).toEqual(first);
    expect(first.lifetimeXp).not.toBe(400);
  });

  it("does not sum two duplicate snapshots", () => {
    const local = { snapshotHash: "same", lifetimeXp: 200, availableXp: 200 };
    const cloud = { snapshotHash: "same", lifetimeXp: 200, availableXp: 200, revision: 3 };

    const result = reconcilePhase1(local, cloud);

    expect(result.cloudAuthoritative.lifetimeXp).toBe(200);
    expect(result.cloudAuthoritative.availableXp).toBe(200);
    expect(result.conflicts).toEqual([]);
  });
});
describe("stale cloud state isolation", () => {
  it("does not overwrite acknowledged revision 8 with a delayed revision 7 response", () => {
    const local = {
      cloudRevision: 8,
      acknowledged: { availableXp: 245, lifetimeXp: 245 },
      optimisticDelta: 4,
      pendingOperationIds: ["50000000-0000-4000-8000-000000000001"],
    };
    const staleCloud = { revision: 7, availableXp: 241, lifetimeXp: 241 };

    const result = reconcilePhase1(local, staleCloud);

    expect(result.cloudRevision).toBe(8);
    expect(result.acknowledged.availableXp).toBe(245);
    expect(result.optimisticDelta).toBe(4);
    expect(result.visible.availableXp).toBe(249);
    expect(result.ignoredCloudRevision).toBe(7);
  });

  it("never lets an optimistic cache overwrite cloud-authoritative protected fields", () => {
    const local = {
      cloudRevision: 8,
      acknowledged: { availableXp: 245, lifetimeXp: 245 },
      optimisticDelta: 50_000,
      pendingOperationIds: ["50000000-0000-4000-8000-000000000002"],
    };
    const cloud = { revision: 9, availableXp: 245, lifetimeXp: 245 };

    const result = reconcilePhase1(local, cloud);

    expect(result.cloudAuthoritative.availableXp).toBe(245);
    expect(result.cloudAuthoritative.lifetimeXp).toBe(245);
    expect(result.pendingOperationIds).toContain("50000000-0000-4000-8000-000000000002");
  });
});
