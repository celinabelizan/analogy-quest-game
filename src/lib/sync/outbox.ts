import {
  deleteOutbox,
  getMeta,
  importFallbackOutbox,
  putMeta,
  putOutbox,
  putSequencedEvidence,
  readOutbox,
} from "./indexed-db";
import type { OutboxRecord, SyncCommand, XpEvidenceCommand } from "./types";

const FALLBACK_KEY = "ssatquest.phase1.sync-outbox";
const SEQUENCE_KEY = "device-sequence";
const SEQUENCE_SHADOW_KEY = "ssatquest.phase1.device-sequence-shadow";

function ordered(records: OutboxRecord[]) {
  return records.sort((a, b) => {
    const rank = (record: OutboxRecord) =>
      record.command.kind === "xp_evidence" ? 0 : record.command.kind === "reward_proposal" ? 1 : 2;
    const rankDelta = rank(a) - rank(b);
    if (rankDelta !== 0) return rankDelta;
    if (a.command.kind === "xp_evidence" && b.command.kind === "xp_evidence") {
      return a.command.deviceSequence - b.command.deviceSequence;
    }
    return a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId);
  });
}

function fallbackRead(): OutboxRecord[] {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? "[]") as OutboxRecord[];
  } catch {
    return [];
  }
}
function fallbackWrite(records: OutboxRecord[]) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
}

export async function nextDeviceSequence(): Promise<number> {
  try {
    const current = (await getMeta<number>(SEQUENCE_KEY)) ?? 0;
    await putMeta(SEQUENCE_KEY, current + 1);
    return current + 1;
  } catch {
    const key = `${FALLBACK_KEY}.sequence`,
      current = Number(localStorage.getItem(key) ?? "0");
    localStorage.setItem(key, String(current + 1));
    return current + 1;
  }
}

export async function enqueue(command: SyncCommand): Promise<OutboxRecord> {
  const record: OutboxRecord = {
    eventId: command.eventId,
    command,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
  };
  try {
    await putOutbox(record);
  } catch {
    const all = fallbackRead();
    if (!all.some((item) => item.eventId === record.eventId)) fallbackWrite([...all, record]);
  }
  return record;
}

/** Preferred XP API: allocation + insert cannot be torn apart by a crash. */
export async function enqueueXpEvidence(command: Omit<XpEvidenceCommand, "deviceSequence">) {
  try {
    return await putSequencedEvidence(command);
  } catch {
    const records = fallbackRead();
    const current = Math.max(
      Number(localStorage.getItem(`${FALLBACK_KEY}.sequence`) ?? "0"),
      Number(localStorage.getItem(SEQUENCE_SHADOW_KEY) ?? "0"),
      ...records.map((record) =>
        record.command.kind === "xp_evidence" ? record.command.deviceSequence : 0,
      ),
    );
    const record: OutboxRecord = {
      eventId: command.eventId,
      command: { ...command, deviceSequence: current + 1 },
      status: "pending",
      createdAt: new Date().toISOString(),
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
    };
    localStorage.setItem(`${FALLBACK_KEY}.sequence`, String(current + 1));
    fallbackWrite([...records, record]);
    return record;
  }
}

export async function allOutbox(): Promise<OutboxRecord[]> {
  try {
    const dbRecords = await readOutbox(),
      fallback = fallbackRead();
    await importFallbackOutbox(
      fallback.filter((record) => !dbRecords.some((item) => item.eventId === record.eventId)),
    );
    if (fallback.length) fallbackWrite([]);
    return ordered(
      [
        ...dbRecords,
        ...fallback.filter((record) => !dbRecords.some((item) => item.eventId === record.eventId)),
      ].map((record) =>
        record.status === "sending" ? { ...record, status: "pending" as const } : record,
      ),
    );
  } catch {
    return ordered(
      fallbackRead().map((record) =>
        record.status === "sending" ? { ...record, status: "pending" as const } : record,
      ),
    );
  }
}

export async function updateOutbox(record: OutboxRecord) {
  try {
    await putOutbox(record);
  } catch {
    const all = fallbackRead();
    fallbackWrite(
      all.some((item) => item.eventId === record.eventId)
        ? all.map((item) => (item.eventId === record.eventId ? record : item))
        : [...all, record],
    );
  }
}

/** Receipt/projection must be durably saved by the caller before this acknowledgement. */
export async function acknowledge(eventId: string) {
  try {
    await deleteOutbox(eventId);
  } catch {
    fallbackWrite(fallbackRead().filter((item) => item.eventId !== eventId));
  }
}

export function retryAt(attempts: number) {
  const delay = Math.min(300_000, 1_000 * 2 ** Math.min(attempts, 8));
  return new Date(Date.now() + delay + Math.random() * 500).toISOString();
}

export type LegacyOutboxOperation = {
  id: string;
  profileId: string;
  deviceId: string;
  sequence: number;
  kind: string;
  payload: unknown;
  createdAt: string;
  status?: "pending" | "in_flight" | "quarantined";
  quarantineReason?: string;
};

/** Small isolated IndexedDB contract used by tests and migration tooling. */
export function createOutbox({
  databaseName = "ssatquest-phase1-operations",
}: { databaseName?: string } = {}) {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore("operations", { keyPath: "id" });
        store.createIndex("sequence", "sequence");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  const done = (tx: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  let current: IDBDatabase | undefined;
  const db = async () => (current ??= await open());
  const list = async (filter?: { status?: string }) => {
    const d = await db(),
      tx = d.transaction("operations", "readonly"),
      req = tx.objectStore("operations").getAll();
    const values = await new Promise<LegacyOutboxOperation[]>((res, rej) => {
      req.onsuccess = () => res(req.result as LegacyOutboxOperation[]);
      req.onerror = () => rej(req.error);
    });
    await done(tx);
    return values
      .filter((x) =>
        (filter?.status ?? "active") === "active"
          ? x.status !== "quarantined"
          : x.status === filter?.status,
      )
      .sort((a, b) => a.sequence - b.sequence);
  };
  return {
    async enqueue(op: LegacyOutboxOperation) {
      const d = await db(),
        tx = d.transaction("operations", "readwrite"),
        store = tx.objectStore("operations");
      const existing = await new Promise<LegacyOutboxOperation | undefined>((res, rej) => {
        const r = store.get(op.id);
        r.onsuccess = () => res(r.result as LegacyOutboxOperation | undefined);
        r.onerror = () => rej(r.error);
      });
      if (existing && JSON.stringify(existing.payload) !== JSON.stringify(op.payload)) {
        tx.abort();
        throw new Error("operation id reused with different payload");
      }
      if (!existing) store.add({ ...op, status: "pending" });
      await done(tx);
    },
    list,
    async ack(id: string) {
      const d = await db(),
        tx = d.transaction("operations", "readwrite");
      tx.objectStore("operations").delete(id);
      await done(tx);
    },
    async quarantine(id: string, reason: string) {
      const d = await db(),
        tx = d.transaction("operations", "readwrite"),
        store = tx.objectStore("operations"),
        r = store.get(id);
      const op = await new Promise<LegacyOutboxOperation | undefined>((res, rej) => {
        r.onsuccess = () => res(r.result as LegacyOutboxOperation | undefined);
        r.onerror = () => rej(r.error);
      });
      if (op) store.put({ ...op, status: "quarantined", quarantineReason: reason });
      await done(tx);
    },
    async markInFlight(id: string) {
      const d = await db(),
        tx = d.transaction("operations", "readwrite"),
        store = tx.objectStore("operations"),
        r = store.get(id);
      const op = await new Promise<LegacyOutboxOperation | undefined>((res, rej) => {
        r.onsuccess = () => res(r.result as LegacyOutboxOperation | undefined);
        r.onerror = () => rej(r.error);
      });
      if (op) store.put({ ...op, status: "in_flight" });
      await done(tx);
    },
    async close() {
      (await db()).close();
      current = undefined;
    },
  };
}
