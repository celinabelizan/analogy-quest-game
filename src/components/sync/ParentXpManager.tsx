import { useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";

export function ParentXpManager() {
  const snapshot = usePhase1Snapshot();
  const [childId, setChildId] = useState(snapshot.children[0]?.id ?? "");
  const [mode, setMode] = useState<"add" | "subtract" | "set_exact">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const child = snapshot.children.find((item) => item.id === childId) ?? snapshot.children[0];

  if (!child) return null;
  const submit = async () => {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < 0 || (mode !== "set_exact" && value === 0))
      return setError("Enter a valid XP amount.");
    if (!reason.trim()) return setError("Add an audit reason.");
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().adjustXp(
        child.id,
        mode,
        value,
        reason.trim(),
        crypto.randomUUID(),
      );
      setAmount("");
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not adjust XP.");
    } finally {
      setBusy(false);
    }
  };

  const awardExitTicket = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await getPhase1SyncAdapter().awardExitTicket(
        child.id,
        "Parent confirmed spoken exit ticket",
        crypto.randomUUID(),
      );
      setNotice(`Recorded ${child.displayName}'s exit ticket for the Los Angeles calendar day.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record exit ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="quest-card space-y-4 p-6">
      <div>
        <h2 className="text-xl font-extrabold">Audited XP actions</h2>
        <p className="text-sm text-muted-foreground">
          Every action creates an immutable ledger event; it never rewrites a balance invisibly.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">
          Child
          <select
            value={child.id}
            onChange={(event) => setChildId(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
          >
            {snapshot.children.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Action
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
          >
            <option value="add">Add XP</option>
            <option value="subtract">Subtract XP</option>
            <option value="set_exact">Set spendable exactly</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          Amount
          <input
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
          />
        </label>
      </div>
      <p className="text-sm">
        <b>{child.displayName}:</b> {child.availableXp} available · {child.lifetimeXp} lifetime
        {child.pendingXp > 0 ? ` · ${child.pendingXp} pending` : ""}
        {child.needsReviewXp > 0 ? ` · ${child.needsReviewXp} needs review` : ""}
      </p>
      <label className="block text-sm font-bold">
        Required audit reason
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-background px-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm font-bold text-emerald-800">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Recording…" : "Record adjustment"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void awardExitTicket()}
          className="rounded-full border border-primary px-5 py-2 font-bold text-primary disabled:opacity-50"
        >
          Spoken exit ticket (+20)
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Daily uniqueness is enforced by the server using America/Los_Angeles, including
        migration-day duplicate protection.
      </p>
    </section>
  );
}
