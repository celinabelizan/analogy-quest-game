import type { CloudSyncProjection, OutboxRecord } from "./types";

const DB_NAME = "ssatquest-phase1-sync";
const DB_VERSION = 2;
const OUTBOX = "outbox";
const META = "meta";
const IMAGES = "pending-images";
const TOKENS = "attempt-tokens";
const SEQUENCE_KEY = "device-sequence";
const SEQUENCE_SHADOW_KEY = "ssatquest.phase1.device-sequence-shadow";

export type PendingImage = {
  id: string;
  blob: Blob;
  profileId: string;
  rewardId: string;
  revisionId: string;
  expectedRewardVersion: number;
  createdAt: string;
  status?: "waiting" | "failed";
};

let dbPromise: Promise<IDBDatabase> | undefined;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function openSyncDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX)) {
        const outbox = db.createObjectStore(OUTBOX, { keyPath: "eventId" });
        outbox.createIndex("createdAt", "createdAt");
        outbox.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(TOKENS))
        db.createObjectStore(TOKENS, { keyPath: "tokenId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open sync database"));
  });
  return dbPromise;
}

export async function putOutbox(record: OutboxRecord) {
  const db = await openSyncDb(),
    tx = db.transaction(OUTBOX, "readwrite");
  tx.objectStore(OUTBOX).put(record);
  await transactionDone(tx);
}

/** Atomically allocates the next contiguous device sequence and stores evidence. */
export async function putSequencedEvidence(
  command: Omit<import("./types").XpEvidenceCommand, "deviceSequence">,
): Promise<OutboxRecord> {
  const db = await openSyncDb(),
    tx = db.transaction([OUTBOX, META], "readwrite");
  const meta = tx.objectStore(META),
    outbox = tx.objectStore(OUTBOX);
  const current = Number((await request(meta.get(SEQUENCE_KEY))) ?? 0),
    deviceSequence = current + 1;
  const sequenced = { ...command, deviceSequence };
  const record: OutboxRecord = {
    eventId: command.eventId,
    command: sequenced,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
  };
  meta.put(deviceSequence, SEQUENCE_KEY);
  outbox.add(record);
  await transactionDone(tx);
  localStorage.setItem(SEQUENCE_SHADOW_KEY, String(deviceSequence));
  return record;
}

/** Imports localStorage fallback records without allowing the IDB sequence to move backwards. */
export async function importFallbackOutbox(records: OutboxRecord[]) {
  if (!records.length) return;
  const db = await openSyncDb(),
    tx = db.transaction([OUTBOX, META], "readwrite");
  const outbox = tx.objectStore(OUTBOX),
    meta = tx.objectStore(META);
  const current = Number((await request(meta.get(SEQUENCE_KEY))) ?? 0);
  let highest = current;
  for (const record of records) {
    outbox.put(record);
    if (record.command.kind === "xp_evidence") {
      highest = Math.max(highest, record.command.deviceSequence);
    }
  }
  meta.put(highest, SEQUENCE_KEY);
  await transactionDone(tx);
  localStorage.setItem(SEQUENCE_SHADOW_KEY, String(highest));
}

export async function readOutbox(): Promise<OutboxRecord[]> {
  const db = await openSyncDb(),
    tx = db.transaction(OUTBOX, "readonly");
  const records = (await request(tx.objectStore(OUTBOX).getAll())) as OutboxRecord[];
  await transactionDone(tx);
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

export async function deleteOutbox(eventId: string) {
  const db = await openSyncDb(),
    tx = db.transaction(OUTBOX, "readwrite");
  tx.objectStore(OUTBOX).delete(eventId);
  await transactionDone(tx);
}

export async function putMeta<T>(key: string, value: T) {
  const db = await openSyncDb(),
    tx = db.transaction(META, "readwrite");
  tx.objectStore(META).put(value, key);
  await transactionDone(tx);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openSyncDb(),
    tx = db.transaction(META, "readonly");
  const value = (await request(tx.objectStore(META).get(key))) as T | undefined;
  await transactionDone(tx);
  return value;
}

export const putConfirmedProjection = (projection: CloudSyncProjection) =>
  putMeta("confirmed-projection", projection);
export const getConfirmedProjection = () => getMeta<CloudSyncProjection>("confirmed-projection");

export async function putPendingImage(image: PendingImage) {
  const db = await openSyncDb(),
    tx = db.transaction(IMAGES, "readwrite");
  tx.objectStore(IMAGES).put(image);
  await transactionDone(tx);
}

export async function getPendingImage(id: string): Promise<PendingImage | undefined> {
  const db = await openSyncDb(),
    tx = db.transaction(IMAGES, "readonly");
  const value = (await request(tx.objectStore(IMAGES).get(id))) as PendingImage | undefined;
  await transactionDone(tx);
  return value;
}

export async function listPendingImages(): Promise<PendingImage[]> {
  const db = await openSyncDb(),
    tx = db.transaction(IMAGES, "readonly");
  const values = (await request(tx.objectStore(IMAGES).getAll())) as PendingImage[];
  await transactionDone(tx);
  return values;
}

export async function deletePendingImage(id: string) {
  const db = await openSyncDb(),
    tx = db.transaction(IMAGES, "readwrite");
  tx.objectStore(IMAGES).delete(id);
  await transactionDone(tx);
}

export type AttemptToken = {
  tokenId: string;
  secret: string;
  expiresAt: string;
  attemptId?: string;
  contentId?: string;
};
export async function putAttemptTokens(tokens: AttemptToken[]) {
  const db = await openSyncDb(),
    tx = db.transaction(TOKENS, "readwrite"),
    store = tx.objectStore(TOKENS);
  for (const token of tokens) store.put(token);
  await transactionDone(tx);
}
export async function listAttemptTokens(): Promise<AttemptToken[]> {
  const db = await openSyncDb(),
    tx = db.transaction(TOKENS, "readonly"),
    values = (await request(tx.objectStore(TOKENS).getAll())) as AttemptToken[];
  await transactionDone(tx);
  return values.filter((token) => token.expiresAt > new Date().toISOString());
}
export async function bindAttemptToken(
  attemptId: string,
  contentId: string,
): Promise<AttemptToken | undefined> {
  const db = await openSyncDb();
  const tx = db.transaction(TOKENS, "readwrite");
  const store = tx.objectStore(TOKENS);
  const values = (await request(store.getAll())) as AttemptToken[];
  const now = new Date().toISOString();
  const usable = values.filter((token) => token.expiresAt > now);
  const existing = usable.find(
    (token) => token.attemptId === attemptId && token.contentId === contentId,
  );
  if (existing) {
    await transactionDone(tx);
    return existing;
  }
  const free = usable.find((token) => !token.attemptId);
  if (!free) {
    await transactionDone(tx);
    return undefined;
  }
  const bound = { ...free, attemptId, contentId };
  store.put(bound);
  await transactionDone(tx);
  return bound;
}
export async function deleteAttemptToken(tokenId: string) {
  const db = await openSyncDb(),
    tx = db.transaction(TOKENS, "readwrite");
  tx.objectStore(TOKENS).delete(tokenId);
  await transactionDone(tx);
}
