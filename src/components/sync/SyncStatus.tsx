import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";
import type { SyncState } from "./model";

const labels: Record<SyncState, string> = {
  unavailable: "Local-only mode",
  unpaired: "Not paired",
  offline: "Offline — work saved here",
  pending: "Waiting to sync",
  syncing: "Syncing safely…",
  synced: "Synced",
  needs_review: "Parent review needed",
  revoked: "Device access revoked",
  recovery_required: "Parent recovery required",
};

function StatusIcon({ state }: { state: SyncState }) {
  if (state === "synced") return <CheckCircle2 aria-hidden className="h-4 w-4" />;
  if (state === "offline" || state === "pending")
    return <CloudOff aria-hidden className="h-4 w-4" />;
  if (state === "revoked" || state === "recovery_required") {
    return <ShieldAlert aria-hidden className="h-4 w-4" />;
  }
  if (state === "needs_review") return <AlertTriangle aria-hidden className="h-4 w-4" />;
  return (
    <RefreshCw aria-hidden className={`h-4 w-4 ${state === "syncing" ? "animate-spin" : ""}`} />
  );
}

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const snapshot = usePhase1Snapshot();
  const [retrying, setRetrying] = useState(false);
  const retryable =
    snapshot.adapterAvailable &&
    ["offline", "pending", "needs_review"].includes(snapshot.connection);

  const retry = async () => {
    setRetrying(true);
    try {
      await getPhase1SyncAdapter().retrySync();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <aside
      aria-live="polite"
      className={`flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
        snapshot.connection === "needs_review" || snapshot.connection === "recovery_required"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-border bg-background/90"
      }`}
    >
      <StatusIcon state={snapshot.connection} />
      <span className="font-bold">{labels[snapshot.connection]}</span>
      {!compact && snapshot.counts.pending > 0 && <span>{snapshot.counts.pending} queued</span>}
      {!compact && snapshot.counts.needsReview > 0 && (
        <span>{snapshot.counts.needsReview} awaiting review</span>
      )}
      {!compact && snapshot.lastSyncedAt && (
        <span className="text-muted-foreground">
          Last synced {new Date(snapshot.lastSyncedAt).toLocaleString()}
        </span>
      )}
      {retryable && (
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="ml-auto rounded-full border border-current px-3 py-1 font-bold disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
      )}
    </aside>
  );
}
