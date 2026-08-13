import type { CloudSyncProjection, OutboxRecord, SyncCache } from "./types";

export function xpBuckets(records: OutboxRecord[]) {
  return records.reduce(
    (sum, record) => {
      if (record.command.kind !== "xp_evidence") return sum;
      const claimed =
        typeof record.serverReceipt === "object" &&
        record.serverReceipt &&
        "awardedXp" in record.serverReceipt
          ? Number((record.serverReceipt as { awardedXp?: unknown }).awardedXp) || 0
          : 0;
      if (record.status === "needs_review") sum.reviewXp += claimed;
      else if (record.status === "rejected") sum.rejectedXp += claimed;
      else sum.pendingXp += claimed;
      return sum;
    },
    { pendingXp: 0, reviewXp: 0, rejectedXp: 0 },
  );
}

/**
 * Applies only the Phase-1 cloud envelope. It cannot overwrite analogy or
 * Vocabulary V1 state because those fields do not exist in this type/cache.
 */
export function mergeCloudProjection(cache: SyncCache, incoming: CloudSyncProjection): SyncCache {
  if (cache.confirmed) {
    if (cache.confirmed.profileId !== incoming.profileId) throw new Error("Cloud profile mismatch");
    if (incoming.balance.version < cache.confirmed.balance.version) return cache;
    if (
      incoming.balance.version === cache.confirmed.balance.version &&
      incoming.serverCursor < cache.confirmed.serverCursor
    )
      return cache;
  }
  return { ...cache, confirmed: incoming, updatedAt: new Date().toISOString() };
}
