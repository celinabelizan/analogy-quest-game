export type RewardWithdrawalCommand = {
  kind: "reward_withdrawal";
  eventId: string;
  revisionId: string;
  expectedRewardVersion: number;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
};

const DB_NAME = "ssatquest-phase1-reward-commands";
const STORE = "commands";
const FALLBACK = "ssatquest.phase1.reward-commands";
let database: Promise<IDBDatabase> | undefined;

export function expectedImageAttachmentVersion(
  input:
    | { kind: "proposal" }
    | { kind: "revision"; expectedRewardVersion: number }
    | { kind: "confirmed"; currentRewardVersion: number },
) {
  return input.kind === "proposal"
    ? 0
    : input.kind === "revision"
      ? input.expectedRewardVersion + 1
      : input.currentRewardVersion + 1;
}

export function newestPendingImagesByReward<T extends { rewardId: string; createdAt: string }>(
  images: T[],
) {
  const newest = new Map<string, T>();
  for (const image of images) {
    const prior = newest.get(image.rewardId);
    if (!prior || prior.createdAt < image.createdAt) newest.set(image.rewardId, image);
  }
  return [...newest.values()];
}

export function nextPendingImageCreatedAt(
  prior: Array<{ createdAt: string }>,
  now = Date.now(),
): string {
  return new Date(
    Math.max(now, ...prior.map((image) => Date.parse(image.createdAt) + 1).filter(Number.isFinite)),
  ).toISOString();
}

function fallbackRead(): RewardWithdrawalCommand[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FALLBACK) ?? "[]") as RewardWithdrawalCommand[];
  } catch {
    return [];
  }
}
function fallbackWrite(commands: RewardWithdrawalCommand[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(FALLBACK, JSON.stringify(commands));
}
function open() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: "eventId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Reward queue unavailable"));
  });
  return database;
}
function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Reward queue request failed"));
  });
}
function done(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Reward queue failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Reward queue aborted"));
  });
}
async function persist(command: RewardWithdrawalCommand) {
  const db = await open(),
    transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).put(command);
  await done(transaction);
}
async function remove(eventId: string) {
  try {
    const db = await open(),
      transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(eventId);
    await done(transaction);
  } catch {
    fallbackWrite(fallbackRead().filter((command) => command.eventId !== eventId));
  }
}

export async function enqueueRewardWithdrawal(
  input: Pick<RewardWithdrawalCommand, "eventId" | "revisionId" | "expectedRewardVersion">,
) {
  const command: RewardWithdrawalCommand = {
    kind: "reward_withdrawal",
    ...input,
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
  };
  try {
    await persist(command);
  } catch {
    const fallback = fallbackRead();
    if (!fallback.some((item) => item.eventId === command.eventId))
      fallbackWrite([...fallback, command]);
  }
  return command;
}

export async function listRewardWithdrawals(): Promise<RewardWithdrawalCommand[]> {
  const fallback = fallbackRead();
  try {
    const db = await open(),
      transaction = db.transaction(STORE, "readwrite"),
      store = transaction.objectStore(STORE);
    const stored = (await result(store.getAll())) as RewardWithdrawalCommand[];
    for (const command of fallback)
      if (!stored.some((item) => item.eventId === command.eventId)) store.put(command);
    await done(transaction);
    if (fallback.length) fallbackWrite([]);
    return [
      ...stored,
      ...fallback.filter((x) => !stored.some((y) => y.eventId === x.eventId)),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return fallback.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export async function flushRewardWithdrawals(
  submit: (command: RewardWithdrawalCommand) => Promise<unknown>,
) {
  for (const command of await listRewardWithdrawals()) {
    if (command.nextAttemptAt > new Date().toISOString()) continue;
    try {
      await submit(command);
      await remove(command.eventId);
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      if (
        /revision not found|only the child|stale reward version|not pending|revoked|not allowed/i.test(
          message,
        )
      )
        await remove(command.eventId);
      else {
        const next = {
          ...command,
          attempts: command.attempts + 1,
          nextAttemptAt: new Date(
            Date.now() + Math.min(300_000, 1_000 * 2 ** Math.min(command.attempts + 1, 8)),
          ).toISOString(),
        };
        try {
          await persist(next);
        } catch {
          fallbackWrite([
            ...fallbackRead().filter((item) => item.eventId !== command.eventId),
            next,
          ]);
        }
      }
      break;
    }
  }
}

export function resetRewardQueueConnectionForTests() {
  database = undefined;
}
