import { Archive, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "@/components/sync/bridge";
import type {
  ChildCloudView,
  ParentRewardDecision,
  RewardDraft,
  RewardRevisionView,
} from "@/components/sync/model";
import { RewardForm } from "./RewardForm";
import { RewardStatusBadge } from "./RewardStatusBadge";

function PendingReview({ child, reward }: { child: ChildCloudView; reward: RewardRevisionView }) {
  const [name, setName] = useState(reward.name);
  const [xp, setXp] = useState(String(reward.authoritativeXpCost ?? ""));
  const [reason, setReason] = useState("");
  const [oneTime, setOneTime] = useState(reward.oneTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "decline") => {
    const cost = Math.round(Number(xp));
    if (decision === "approve" && (!Number.isFinite(cost) || cost <= 0))
      return setError("Set a positive authoritative XP cost.");
    if (!reason.trim()) return setError("Add an audit reason.");
    const input: ParentRewardDecision = {
      revisionId: reward.id,
      decision,
      reason: reason.trim(),
      expectedVersion: reward.version,
    };
    if (decision === "approve") {
      input.finalName = name.trim();
      input.authoritativeXpCost = cost;
      input.oneTime = oneTime;
      if (reward.productUrl) input.finalProductUrl = reward.productUrl;
      if (reward.estimatedPriceCents !== undefined)
        input.finalEstimatedPriceCents = reward.estimatedPriceCents;
    }
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().reviewReward(input);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            {child.displayName} proposed
          </p>
          <h3 className="font-extrabold">{reward.name}</h3>
        </div>
        <RewardStatusBadge status={reward.status} />
      </div>
      {reward.hasPendingRevision && (
        <p className="mt-2 text-xs font-bold text-amber-900">
          This revises an approved reward. The approved version is still active.
        </p>
      )}
      {reward.productUrl && (
        <a
          href={reward.productUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary"
        >
          Review product link <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Final reward name
          <input
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
          />
        </label>
        <label className="text-sm font-bold">
          Authoritative XP cost
          <input
            inputMode="numeric"
            value={xp}
            onChange={(event) => setXp(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={oneTime}
          onChange={(event) => setOneTime(event.target.checked)}
          className="h-5 w-5"
        />{" "}
        One-time reward
      </label>
      <label className="mt-3 block text-sm font-bold">
        Audit note
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why this was approved or declined"
          className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("approve")}
          className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("decline")}
          className="rounded-full border border-border px-5 py-2 font-bold disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </article>
  );
}

function ApprovedReward({ reward }: { reward: RewardRevisionView }) {
  const [editing, setEditing] = useState(false);
  const [xp, setXp] = useState(String(reward.authoritativeXpCost ?? ""));
  const [reason, setReason] = useState("");
  const [oneTime, setOneTime] = useState(reward.oneTime);
  const [error, setError] = useState<string | null>(null);

  const save = async (draft: RewardDraft) => {
    const cost = Math.round(Number(xp));
    if (!Number.isFinite(cost) || cost <= 0)
      throw new Error("Set a positive authoritative XP cost.");
    if (!reason.trim()) throw new Error("Add an audit reason.");
    await getPhase1SyncAdapter().parentEditReward(
      reward.rewardId,
      draft,
      cost,
      oneTime,
      reason.trim(),
      reward.version,
    );
    setEditing(false);
  };

  if (editing)
    return (
      <div>
        <RewardForm
          initial={reward}
          offline={false}
          onCancel={() => setEditing(false)}
          onSubmit={save}
        />
        <div className="-mt-2 rounded-b-2xl border border-t-0 border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Authoritative XP cost
              <input
                inputMode="numeric"
                value={xp}
                onChange={(event) => setXp(event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border px-3"
              />
            </label>
            <label className="text-sm font-bold">
              Audit note
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border px-3"
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={oneTime}
              onChange={(event) => setOneTime(event.target.checked)}
            />{" "}
            One-time reward
          </label>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );

  const archive = async () => {
    const note = window.prompt("Audit reason for archiving this reward:");
    if (!note?.trim()) return;
    try {
      await getPhase1SyncAdapter().archiveReward(reward.rewardId, note.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not archive reward.");
    }
  };

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-extrabold">{reward.name}</h3>
          <p className="text-sm text-muted-foreground">
            {reward.authoritativeXpCost} XP · {reward.oneTime ? "one-time" : "reusable"}
          </p>
        </div>
        <RewardStatusBadge status={reward.status} />
      </div>
      {reward.hasPendingRevision && (
        <p className="mt-2 text-xs font-bold text-amber-800">Child revision awaiting review</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-border px-3 py-2 text-sm font-bold"
        >
          Edit final details
        </button>
        <button
          type="button"
          onClick={() => void archive()}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-bold text-destructive"
        >
          <Archive aria-hidden className="h-4 w-4" /> Archive
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-destructive">{error}</p>}
    </article>
  );
}

export function ParentRewardCenter() {
  const snapshot = usePhase1Snapshot();
  const [selectedId, setSelectedId] = useState(snapshot.children[0]?.id ?? "");
  const selected =
    snapshot.children.find((child) => child.id === selectedId) ?? snapshot.children[0];
  const pending = useMemo(
    () =>
      snapshot.children.flatMap((child) =>
        child.rewards
          .filter((reward) => reward.status === "pending")
          .map((reward) => ({ child, reward })),
      ),
    [snapshot.children],
  );
  const [error, setError] = useState<string | null>(null);

  if (!snapshot.adapterAvailable || !selected) return null;
  const resolve = async (id: string, decision: "approve" | "decline") => {
    const reason = window.prompt(`Audit reason to ${decision} this redemption:`);
    if (!reason?.trim()) return;
    try {
      await getPhase1SyncAdapter().resolveRedemption(id, decision, reason.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resolve redemption.");
    }
  };

  return (
    <section className="quest-card space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold">Synchronized rewards</h2>
        <p className="text-sm text-muted-foreground">
          Proposals, approvals, redemptions, and parent edits are audited. Nothing purchases
          automatically.
        </p>
      </div>
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-amber-900">
            Awaiting parent review ({pending.length})
          </h3>
          {pending.map(({ child, reward }) => (
            <PendingReview key={reward.id} child={child} reward={reward} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {snapshot.children.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => setSelectedId(child.id)}
            className={
              selected.id === child.id
                ? "rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground"
                : "rounded-full border border-border px-5 py-2 font-bold"
            }
          >
            {child.displayName}
          </button>
        ))}
      </div>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4 text-sm font-bold">
        <span>
          Show rewards on {selected.displayName}&rsquo;s device
          {!selected.rewardsVisible && (
            <small className="mt-1 block font-normal text-muted-foreground">
              Off by default until a parent intentionally enables it.
            </small>
          )}
        </span>
        <input
          type="checkbox"
          checked={selected.rewardsVisible}
          onChange={(event) =>
            void getPhase1SyncAdapter().setRewardVisibility(
              selected.id,
              event.target.checked,
              "Parent changed reward visibility",
            )
          }
          className="h-5 w-5"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {selected.rewards
          .filter((reward) => reward.status === "approved")
          .map((reward) => (
            <ApprovedReward key={reward.id} reward={reward} />
          ))}
      </div>
      {selected.redemptions
        .filter((item) => item.status === "pending")
        .map((item) => (
          <article key={item.id} className="rounded-2xl border border-primary p-4">
            <h3 className="font-extrabold">Redemption request: {item.rewardName}</h3>
            <p className="text-sm text-muted-foreground">
              {item.cost} XP · requested {new Date(item.requestedAt).toLocaleString()}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void resolve(item.id, "approve")}
                className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground"
              >
                Approve redemption
              </button>
              <button
                type="button"
                onClick={() => void resolve(item.id, "decline")}
                className="rounded-full border border-border px-4 py-2 font-bold"
              >
                Decline
              </button>
            </div>
          </article>
        ))}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
