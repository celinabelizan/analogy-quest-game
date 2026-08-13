import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { archiveRejectedReward, listRejectedRewardArchive } from "../../src/lib/sync/outbox";
import {
  enqueueRewardWithdrawal,
  flushRewardWithdrawals,
  listRewardWithdrawals,
  newestPendingImagesByReward,
  nextPendingImageCreatedAt,
  resetRewardQueueConnectionForTests,
  expectedImageAttachmentVersion,
} from "../../src/lib/sync/reward-command-queue";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  },
});

describe("durable reward withdrawal queue", () => {
  beforeEach(() => {
    localStorage.clear();
    resetRewardQueueConnectionForTests();
  });

  it("survives a runtime restart and replays the same idempotency key", async () => {
    const eventId = crypto.randomUUID();
    await enqueueRewardWithdrawal({
      eventId,
      revisionId: crypto.randomUUID(),
      expectedRewardVersion: 4,
    });
    resetRewardQueueConnectionForTests();
    expect(await listRewardWithdrawals()).toEqual([expect.objectContaining({ eventId })]);
    const delivered: string[] = [];
    await flushRewardWithdrawals(async (command) => delivered.push(command.eventId));
    expect(delivered).toEqual([eventId]);
    expect(await listRewardWithdrawals()).toEqual([]);
  });

  it("retains a transiently failed withdrawal for later replay", async () => {
    await enqueueRewardWithdrawal({
      eventId: crypto.randomUUID(),
      revisionId: crypto.randomUUID(),
      expectedRewardVersion: 1,
    });
    await flushRewardWithdrawals(async () => {
      throw new Error("network unavailable");
    });
    expect(await listRewardWithdrawals()).toEqual([
      expect.objectContaining({ attempts: 1, kind: "reward_withdrawal" }),
    ]);
  });
});

describe("pending reward image versioning", () => {
  it("derives attachment versions from the command that creates the revision", () => {
    expect(expectedImageAttachmentVersion({ kind: "proposal" })).toBe(0);
    expect(expectedImageAttachmentVersion({ kind: "revision", expectedRewardVersion: 4 })).toBe(5);
    expect(expectedImageAttachmentVersion({ kind: "confirmed", currentRewardVersion: 7 })).toBe(8);
  });
  it("keeps only the newest crash-safe upload candidate for each reward", () => {
    const selected = newestPendingImagesByReward([
      { rewardId: "r", createdAt: "2026-01-01T00:00:00Z", id: "old" },
      { rewardId: "r", createdAt: "2026-01-02T00:00:00Z", id: "new" },
      { rewardId: "other", createdAt: "2026-01-01T00:00:00Z", id: "other" },
    ]);
    expect(selected.map((image) => image.id).sort()).toEqual(["new", "other"]);
  });
  it("assigns a timestamp strictly newer than equal-millisecond prior images", () => {
    expect(
      nextPendingImageCreatedAt(
        [{ createdAt: "2026-01-01T00:00:00.000Z" }, { createdAt: "2026-01-01T00:00:00.000Z" }],
        Date.parse("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe("2026-01-01T00:00:00.001Z");
  });
});

describe("terminal reward rejection quarantine", () => {
  it("preserves rejected command details outside the active sync outbox", () => {
    const eventId = crypto.randomUUID();
    archiveRejectedReward(
      {
        eventId,
        command: {
          kind: "reward_proposal",
          eventId,
          rewardId: crypto.randomUUID(),
          revisionId: crypto.randomUUID(),
          profileId: crypto.randomUUID(),
          name: "Unsafe",
        },
        status: "sending",
        createdAt: new Date().toISOString(),
        attempts: 1,
        nextAttemptAt: new Date().toISOString(),
      },
      "unsafe product url",
    );
    expect(listRejectedRewardArchive()).toEqual([
      expect.objectContaining({
        reason: "unsafe product url",
        record: expect.objectContaining({ eventId, status: "rejected" }),
      }),
    ]);
  });
});

describe("reward mutation security contracts", () => {
  const rewardsSql = readFileSync(
    resolve("supabase/migrations/202608120004_phase1_rewards.sql"),
    "utf8",
  );
  const imageUpload = readFileSync(
    resolve("supabase/functions/reward-image-upload/index.ts"),
    "utf8",
  );

  it("implements parent editing as one idempotent audited transaction", () => {
    const fn = rewardsSql.match(
      /create or replace function public\.parent_edit_reward[\s\S]*?end \$\$;/i,
    )?.[0];
    expect(fn).toContain("private.prior_receipt('parent_edit_reward'");
    expect(fn).toContain("for update");
    expect(fn).toContain("private.require_parent");
    expect(fn).toContain("private.write_audit");
    expect(fn).toContain("private.store_receipt('parent_edit_reward'");
  });

  it("requires stable upload IDs and reuses a matching finalized asset", () => {
    expect(imageUpload).toContain('form.get("uploadId")');
    expect(imageUpload).toContain('form.get("assetId")');
    expect(imageUpload).toContain("uploadId !== assetId");
    expect(imageUpload).toContain("existing.sha256 === sha256");
    expect(imageUpload).toContain("reused: true");
    expect(imageUpload).toContain("upsert: true");
  });

  it("requires a child to own both the pending revision and attached asset", () => {
    const projectionSql = readFileSync(
      resolve("supabase/migrations/202608120007_phase1_projection_and_settings.sql"),
      "utf8",
    );
    expect(projectionSql).toContain("v_rev.proposed_by<>auth.uid()");
    expect(projectionSql).toContain("v_asset.created_by<>auth.uid()");
  });
});
