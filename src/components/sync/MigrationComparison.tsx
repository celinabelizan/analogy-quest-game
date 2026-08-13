import { AlertTriangle, CheckCircle2, Download, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";
import { HighRiskReauth } from "./HighRiskReauth";
import type { MigrationComparisonView } from "./model";

const domainLabels = {
  xp: "XP balances",
  rewards: "Rewards and active goal",
  redemptions: "Redemptions",
  analogy: "Analogy learning state",
  vocabulary: "Vocabulary V1 mastery",
};

export function MigrationComparison() {
  const snapshot = usePhase1Snapshot();
  const [comparisons, setComparisons] = useState<MigrationComparisonView[]>([]);
  const [prepareProfileId, setPrepareProfileId] = useState<"bianca" | "calista" | "test">("test");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await getPhase1SyncAdapter().getMigrationComparisons();
      setComparisons(rows);
      setSelectedId((current) => current ?? rows[0]?.sessionId ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Migration comparisons could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (snapshot.adapterAvailable) void load();
  }, [snapshot.adapterAvailable]);
  const selected = comparisons.find((item) => item.sessionId === selectedId);

  const prepare = async () => {
    if (prepareProfileId !== "test" && snapshot.realProfileMigrationEnabled !== true) {
      setError("Real child migration preparation is disabled until the later release gate.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().prepareMigration(prepareProfileId);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The migration comparison could not be prepared.",
      );
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().confirmMigration(selected.sessionId, phrase);
      setPhrase("");
      setReauthOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Migration confirmation failed safely.");
      setReauthOpen(false);
      setBusy(false);
    }
  };

  if (!snapshot.adapterAvailable)
    return (
      <p className="quest-card p-6 text-sm text-muted-foreground">
        Migration tools are unavailable in this local-only build. Local data has not changed.
      </p>
    );
  if (!selected)
    return (
      <section className="quest-card space-y-4 p-6">
        <h2 className="text-xl font-extrabold">No staged comparisons</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prepare the Test installation first. This captures the exact raw local data, creates its
          encrypted backup, uploads the reviewed migration material, and stages a read-only cloud
          comparison. It does not make the profile cloud-authoritative.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold">
            Local profile
            <select
              value={prepareProfileId}
              onChange={(event) =>
                setPrepareProfileId(event.target.value as "bianca" | "calista" | "test")
              }
              className="mt-1 min-h-[44px] rounded-xl border border-border bg-background px-3"
            >
              <option value="test">Test</option>
              {snapshot.realProfileMigrationEnabled === true && (
                <>
                  <option value="bianca">Bianca</option>
                  <option value="calista">Calista</option>
                </>
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void prepare()}
            disabled={busy}
            className="min-h-[44px] rounded-full bg-primary px-5 font-extrabold text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Preparing safely…"
              : `Prepare ${prepareProfileId === "test" ? "Test" : prepareProfileId} comparison`}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Real Bianca and Calista preparation remains disabled in this build. Keep the downloaded
          backup and recovery key separate until cross-device verification passes.
        </p>
        {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      </section>
    );

  const backupReady = selected.backupState === "encrypted_export_ready";
  const mayConfirm =
    selected.unresolvedConflicts === 0 &&
    backupReady &&
    phrase === selected.confirmationPhrase &&
    selected.migrationState !== "confirmed_cloud" &&
    (selected.localProfileId === "test" || snapshot.realProfileMigrationEnabled === true);

  return (
    <div className="space-y-5">
      <section className="quest-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">Read-only device comparison</h2>
            <p className="text-sm text-muted-foreground">
              Nothing becomes cloud-authoritative until this exact profile is confirmed.
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              Fresh-start safeguard: a 200-XP source must import as exactly 200 XP, never 400 XP.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 font-bold"
          >
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {comparisons.map((item) => (
            <button
              key={item.sessionId}
              type="button"
              onClick={() => {
                setSelectedId(item.sessionId);
                setPhrase("");
              }}
              className={
                item.sessionId === selected.sessionId
                  ? "rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground"
                  : "rounded-full border border-border px-5 py-2 font-bold"
              }
            >
              {item.profileName}
              {item.localProfileId === "test" ? " (Test)" : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border p-4">
          <label className="text-sm font-bold">
            Prepare another local comparison
            <select
              value={prepareProfileId}
              onChange={(event) =>
                setPrepareProfileId(event.target.value as "bianca" | "calista" | "test")
              }
              className="mt-1 block min-h-[44px] rounded-xl border border-border bg-background px-3"
            >
              <option value="test">Test</option>
              {snapshot.realProfileMigrationEnabled === true && (
                <>
                  <option value="bianca">Bianca</option>
                  <option value="calista">Calista</option>
                </>
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void prepare()}
            disabled={busy}
            className="min-h-[44px] rounded-full border border-primary px-4 font-bold text-primary disabled:opacity-50"
          >
            {busy
              ? "Preparing…"
              : `Prepare ${prepareProfileId === "test" ? "Test" : prepareProfileId} comparison`}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Local device</p>
            <p className="mt-1 text-2xl font-extrabold">{selected.localAvailableXp} XP</p>
            <p className="text-sm text-muted-foreground">{selected.localLifetimeXp} lifetime</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Existing cloud</p>
            <p className="mt-1 text-2xl font-extrabold">{selected.cloudAvailableXp} XP</p>
            <p className="text-sm text-muted-foreground">{selected.cloudLifetimeXp} lifetime</p>
          </div>
        </div>
        <p className="break-all rounded-xl bg-secondary/40 p-3 font-mono text-xs">
          Source SHA-256: {selected.sourceHash}
        </p>
      </section>

      <section className="quest-card overflow-hidden p-0">
        <div className="border-b border-border p-5">
          <h2 className="text-xl font-extrabold">Field-by-field resolution</h2>
        </div>
        <div className="divide-y divide-border">
          {selected.rows.map((row) => (
            <article key={row.domain} className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_1fr]">
              <div>
                <p className="font-extrabold">{domainLabels[row.domain]}</p>
                <p className="mt-1 text-xs text-muted-foreground">Local: {row.localSummary}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Cloud</p>
                <p className="text-sm">{row.cloudSummary}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Rule</p>
                <p className="text-sm">{row.resolution}</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${row.state === "conflict" ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-900"}`}
                >
                  {row.state.replaceAll("_", " ")}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="quest-card space-y-4 p-6">
        <div className="flex items-start gap-3">
          {backupReady ? (
            <CheckCircle2 aria-hidden className="mt-1 h-6 w-6 text-emerald-700" />
          ) : (
            <AlertTriangle aria-hidden className="mt-1 h-6 w-6 text-amber-700" />
          )}
          <div>
            <h2 className="text-xl font-extrabold">Recoverable backup</h2>
            <p className="text-sm text-muted-foreground">
              The exact raw localStorage strings are encrypted client-side. Keep the download and
              separate recovery key until cross-device verification passes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void getPhase1SyncAdapter().exportMigrationBackup(selected.sessionId)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-bold"
        >
          <Download aria-hidden className="h-4 w-4" /> Create or download encrypted backup
        </button>
        <p className="text-xs text-muted-foreground">
          Backup state: {selected.backupState.replaceAll("_", " ")}
        </p>
        {!backupReady && (
          <p className="text-sm font-bold text-amber-900">
            Confirmation is blocked until the raw backup is recoverable.
          </p>
        )}
      </section>

      <section className="quest-card space-y-4 border-2 border-amber-300 p-6">
        <div className="flex items-start gap-3">
          <LockKeyhole aria-hidden className="mt-1 h-6 w-6 text-amber-800" />
          <div>
            <h2 className="text-xl font-extrabold">
              Confirm cloud authority for {selected.profileName}
            </h2>
            <p className="text-sm text-muted-foreground">
              This is idempotent and profile-specific. It does not migrate detailed analogy or
              Vocabulary V1 state; those remain local and preserved in the backup.
            </p>
          </div>
        </div>
        {selected.localProfileId !== "test" && (
          <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950">
            Real child confirmation is disabled in this build. It remains a later release gate after
            the Test profile and actual-device verification are approved.
          </p>
        )}
        {selected.unresolvedConflicts > 0 && (
          <p className="text-sm font-bold text-destructive">
            Resolve {selected.unresolvedConflicts} conflict(s) before confirmation.
          </p>
        )}
        <label className="block text-sm font-bold">
          Type <code>{selected.confirmationPhrase}</code> exactly
          <input
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            disabled={selected.migrationState === "confirmed_cloud"}
            className="mt-1 min-h-[48px] w-full rounded-xl border border-border px-3"
          />
        </label>
        <button
          type="button"
          disabled={!mayConfirm || busy}
          onClick={() => (snapshot.parent.aal === "aal2" ? void confirm() : setReauthOpen(true))}
          className="rounded-full bg-primary px-5 py-3 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {selected.migrationState === "confirmed_cloud"
            ? "Cloud authority confirmed"
            : busy
              ? "Confirming safely…"
              : "Confirm this profile"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </section>

      <HighRiskReauth
        open={reauthOpen}
        title="Verify migration confirmation"
        explanation="Making a profile cloud-authoritative requires your authenticator factor. The server also verifies the backup, comparison state, idempotency key, and unresolved conflicts."
        onCancel={() => setReauthOpen(false)}
        onVerified={() => void confirm()}
      />
    </div>
  );
}
