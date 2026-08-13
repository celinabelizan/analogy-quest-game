import { supabase } from "@/integrations/supabase/client";
import { acknowledge, allOutbox, retryAt, updateOutbox } from "./outbox";
import { getConfirmedProjection, putConfirmedProjection } from "./indexed-db";
import { mergeCloudProjection } from "./reducers";
import type { CloudSyncProjection, OutboxRecord, SyncCache, SyncCommand } from "./types";

async function submit(command: SyncCommand) {
  if (command.kind === "xp_evidence") {
    const { data, error } = await supabase.rpc("submit_xp_evidence", {
      p_event_id: command.eventId,
      p_attempt_id: command.attemptId,
      p_device_sequence: command.deviceSequence,
      p_evidence_kind: command.evidenceKind,
      p_content_id: command.contentId,
      p_content_version: command.contentVersion,
      p_rule_version: command.ruleVersion,
      p_payload: command.payload,
      p_payload_hash: await hashPayload(command.payload),
      p_occurred_at: command.occurredAt,
      p_offline_authorization: command.offlineAuthorization ?? null,
    });
    if (error) throw error;
    return data;
  }
  if (command.kind === "reward_proposal") {
    const { data, error } = await supabase.rpc("submit_reward_proposal", {
      p_reward_id: command.rewardId,
      p_revision_id: command.revisionId,
      p_profile_id: command.profileId,
      p_name: command.name,
      p_product_url: command.productUrl ?? null,
      p_estimated_price_cents: command.estimatedPriceCents ?? null,
      p_image_asset_id: command.imageAssetId ?? null,
      p_idempotency_key: command.eventId,
    });
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.rpc("submit_reward_revision", {
    p_reward_id: command.rewardId,
    p_revision_id: command.revisionId,
    p_expected_reward_version: command.expectedRewardVersion,
    p_name: command.name,
    p_product_url: command.productUrl ?? null,
    p_estimated_price_cents: command.estimatedPriceCents ?? null,
    p_image_asset_id: command.imageAssetId ?? null,
    p_idempotency_key: command.eventId,
  });
  if (error) throw error;
  return data;
}

async function hashPayload(payload: Record<string, unknown>) {
  // The server is authoritative and stores its own JSONB digest. This hash is an
  // accidental-corruption signal only; full immutable-envelope replay checks apply.
  const bytes = new TextEncoder().encode(JSON.stringify(payload, Object.keys(payload).sort()));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    return (
      [candidate.message, candidate.details, candidate.hint, candidate.code]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" — ") || JSON.stringify(error)
    );
  }
  return String(error);
}

export async function flushOutbox(
  onReceipt?: (record: OutboxRecord, receipt: unknown) => Promise<void>,
) {
  const records = await allOutbox();
  const awaitingReview = records.filter(
    (record) => record.status === "needs_review" && record.command.kind === "xp_evidence",
  );
  if (awaitingReview.length) {
    const { data, error } = await supabase
      .from("xp_evidence_events")
      .select("event_id,status,awarded_xp")
      .in(
        "event_id",
        awaitingReview.map((record) => record.eventId),
      );
    if (!error) {
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        if (row["status"] !== "accepted" && row["status"] !== "rejected") continue;
        const record = awaitingReview.find((item) => item.eventId === row["event_id"]);
        if (!record) continue;
        await onReceipt?.(record, row);
        await acknowledge(record.eventId);
      }
    }
  }
  const currentRecords = await allOutbox();
  for (const record of currentRecords) {
    if (
      record.status === "rejected" ||
      record.status === "needs_review" ||
      record.nextAttemptAt > new Date().toISOString()
    )
      continue;
    const sending = { ...record, status: "sending" as const, attempts: record.attempts + 1 };
    await updateOutbox(sending);
    try {
      const receipt = await submit(record.command);
      const status =
        typeof receipt === "object" && receipt && "status" in receipt
          ? String((receipt as { status: unknown }).status)
          : "accepted";
      if (status === "needs_review") {
        await updateOutbox({ ...sending, status: "needs_review", serverReceipt: receipt });
      } else {
        await onReceipt?.(sending, receipt);
        await acknowledge(record.eventId);
      }
    } catch (error) {
      const message = errorText(error);
      if (
        /revoked|not allowed|profile mismatch|already completed|already submitted|already discarded|step already|unknown or inactive|invalid .*evidence|incorrect analogy group|unsafe product url|stale reward version|pending revision already exists/i.test(
          message,
        )
      )
        await updateOutbox({ ...sending, status: "rejected", lastError: message });
      else
        await updateOutbox({
          ...sending,
          status: "pending",
          nextAttemptAt: retryAt(sending.attempts),
          lastError: message,
        });
      // Exact sequence ordering means later commands must wait for this command.
      break;
    }
  }
}

export async function acceptCloudProjection(cache: SyncCache, projection: CloudSyncProjection) {
  const current = await getConfirmedProjection();
  const confirmed = current ?? cache.confirmed;
  const merged = mergeCloudProjection(confirmed ? { ...cache, confirmed } : cache, projection);
  if (merged.confirmed) await putConfirmedProjection(merged.confirmed);
  return merged;
}
