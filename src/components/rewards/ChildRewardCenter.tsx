import { ExternalLink, ImageOff, Pencil, Trash2, WifiOff } from "lucide-react";
import { useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "@/components/sync/bridge";
import type { LocalProfileId, RewardRevisionView } from "@/components/sync/model";
import { RewardForm } from "./RewardForm";
import { RewardStatusBadge } from "./RewardStatusBadge";

export function ChildRewardCenter({ localProfileId }: { localProfileId: LocalProfileId }) {
  const snapshot = usePhase1Snapshot();
  const child =
    snapshot.children.find((candidate) => candidate.localProfileId === localProfileId) ??
    (snapshot.activeChild?.localProfileId === localProfileId ? snapshot.activeChild : undefined);
  const [editing, setEditing] = useState<RewardRevisionView | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!snapshot.adapterAvailable || !child || !child.rewardsVisible) return null;
  const offline = snapshot.connection === "offline" || snapshot.connection === "pending";
  const approved = child.rewards.filter(
    (reward) => reward.status === "approved" && !reward.hasPendingRevision,
  );
  const active = child.rewards.find((reward) => reward.rewardId === child.activeRewardId);
  const pendingRedemption = child.redemptions.find((request) => request.status === "pending");

  const act = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    }
  };

  return (
    <section className="quest-card space-y-5 p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">My reward wishlist</h2>
          <p className="text-sm text-muted-foreground">
            Suggest an idea, then wait for parent approval.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground"
        >
          {adding ? "Close" : "+ Suggest reward"}
        </button>
      </div>

      {adding && (
        <RewardForm
          offline={offline}
          onCancel={() => setAdding(false)}
          onSubmit={async (draft) => {
            await getPhase1SyncAdapter().createRewardProposal(draft);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <RewardForm
          initial={editing}
          offline={offline}
          onCancel={() => setEditing(null)}
          onSubmit={async (draft) => {
            await getPhase1SyncAdapter().reviseReward(editing.rewardId, draft);
            setEditing(null);
          }}
        />
      )}

      {child.rewards.length === 0 ? (
        <p className="rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">
          No reward ideas yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {child.rewards.map((reward) => (
            <li key={reward.id} className="rounded-2xl border border-border p-4">
              {reward.imageUrl ? (
                <img
                  src={reward.imageUrl}
                  alt=""
                  className="mb-3 h-28 w-full rounded-xl object-cover"
                />
              ) : reward.imageStatus === "waiting_for_connection" ? (
                <div className="mb-3 flex h-20 items-center justify-center gap-2 rounded-xl bg-amber-50 text-sm font-bold text-amber-900">
                  <WifiOff aria-hidden className="h-4 w-4" /> Photo waiting for connection
                </div>
              ) : reward.imageStatus === "failed" ? (
                <div className="mb-3 flex h-20 items-center justify-center gap-2 rounded-xl bg-secondary text-sm text-muted-foreground">
                  <ImageOff aria-hidden className="h-4 w-4" /> Reselect photo
                </div>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-extrabold">{reward.name}</h3>
                <RewardStatusBadge status={reward.status} />
              </div>
              {reward.hasPendingRevision && (
                <p className="mt-2 text-xs font-bold text-amber-800">
                  Approved version stays active; changes await approval.
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {reward.authoritativeXpCost !== undefined && <p>{reward.authoritativeXpCost} XP</p>}
                {reward.estimatedPriceCents !== undefined && (
                  <p>Estimated ${(reward.estimatedPriceCents / 100).toFixed(2)}</p>
                )}
                {reward.productUrl && (
                  <a
                    href={reward.productUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 font-bold text-primary"
                  >
                    Product link <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                )}
              </div>
              {reward.status !== "withdrawn" &&
                reward.status !== "archived" &&
                reward.status !== "redeemed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(reward)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-bold"
                    >
                      <Pencil aria-hidden className="h-4 w-4" /> Edit
                    </button>
                    {reward.status === "pending" && (
                      <button
                        type="button"
                        onClick={() =>
                          void act(() => getPhase1SyncAdapter().withdrawRewardRevision(reward.id))
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-bold text-destructive"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" /> Remove
                      </button>
                    )}
                    {reward.status === "approved" && (
                      <button
                        type="button"
                        disabled={reward.rewardId === child.activeRewardId}
                        onClick={() =>
                          void act(() =>
                            getPhase1SyncAdapter().setRewardGoal(
                              reward.rewardId,
                              child.activeRewardVersion,
                            ),
                          )
                        }
                        className="rounded-full border border-primary px-3 py-2 text-sm font-bold text-primary disabled:opacity-50"
                      >
                        {reward.rewardId === child.activeRewardId ? "Current goal" : "Make my goal"}
                      </button>
                    )}
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}

      {active &&
        active.status === "approved" &&
        !pendingRedemption &&
        child.availableXp >= (active.authoritativeXpCost ?? Number.POSITIVE_INFINITY) && (
          <button
            type="button"
            onClick={() =>
              void act(() =>
                getPhase1SyncAdapter().requestRedemption(active.rewardId, active.version),
              )
            }
            className="w-full rounded-full bg-primary px-5 py-3 text-lg font-extrabold text-primary-foreground"
          >
            Request {active.name}
          </button>
        )}
      {pendingRedemption && (
        <p className="rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">
          Waiting for parent approval: {pendingRedemption.rewardName}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      {approved.length === 0 && child.rewards.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Only approved rewards can become a goal or be redeemed.
        </p>
      )}
    </section>
  );
}
