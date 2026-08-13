import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createOutbox } from "../../src/lib/sync/outbox";

const operation = (id: string, sequence: number) => ({
  id,
  profileId: "10000000-0000-4000-8000-000000000001",
  deviceId: "20000000-0000-4000-8000-000000000001",
  sequence,
  kind: "xp_evidence" as const,
  payload: { questionId: "P1", action: "bridge_locked" },
  createdAt: "2026-08-12T20:00:00.000Z",
});
describe("IndexedDB offline outbox", () => {
  let databaseName: string;

  beforeEach(() => {
    databaseName = `ssatquest-test-${crypto.randomUUID()}`;
  });

  it("persists an operation across a simulated process crash", async () => {
    const firstProcess = createOutbox({ databaseName });
    await firstProcess.enqueue(operation("30000000-0000-4000-8000-000000000001", 1));
    await firstProcess.close?.();

    const restartedProcess = createOutbox({ databaseName });
    expect(await restartedProcess.list()).toEqual([
      expect.objectContaining({ id: "30000000-0000-4000-8000-000000000001", sequence: 1 }),
    ]);
  });

  it("does not delete an in-flight operation before acknowledgement", async () => {
    const outbox = createOutbox({ databaseName });
    const op = operation("30000000-0000-4000-8000-000000000002", 1);
    await outbox.enqueue(op);

    // Simulate request delivery followed by a crash before local ack.
    await outbox.markInFlight?.(op.id);
    await outbox.close?.();

    const restarted = createOutbox({ databaseName });
    expect(await restarted.list()).toEqual([expect.objectContaining({ id: op.id })]);
    await restarted.ack(op.id);
    expect(await restarted.list()).toEqual([]);
  });

  it("deduplicates the same stable operation ID without changing its sequence", async () => {
    const outbox = createOutbox({ databaseName });
    const op = operation("30000000-0000-4000-8000-000000000003", 7);

    await outbox.enqueue(op);
    await outbox.enqueue(op);

    expect(await outbox.list()).toEqual([expect.objectContaining({ id: op.id, sequence: 7 })]);
  });

  it("rejects reuse of an operation ID with a different payload", async () => {
    const outbox = createOutbox({ databaseName });
    const op = operation("30000000-0000-4000-8000-000000000004", 1);
    await outbox.enqueue(op);

    await expect(
      outbox.enqueue({ ...op, payload: { questionId: "P1", action: "final_correct" } }),
    ).rejects.toThrow(/payload|idempotency|operation id/i);
  });

  it("preserves per-profile sequence and quarantines a permanent rejection", async () => {
    const outbox = createOutbox({ databaseName });
    const first = operation("30000000-0000-4000-8000-000000000005", 1);
    const second = operation("30000000-0000-4000-8000-000000000006", 2);
    await outbox.enqueue(second);
    await outbox.enqueue(first);

    expect((await outbox.list()).map((entry) => entry.id)).toEqual([first.id, second.id]);
    await outbox.quarantine(first.id, "device_revoked");
    expect(await outbox.list()).toEqual([expect.objectContaining({ id: second.id })]);
    expect(await outbox.list({ status: "quarantined" })).toEqual([
      expect.objectContaining({ id: first.id, quarantineReason: "device_revoked" }),
    ]);
  });
});
