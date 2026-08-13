import { KeyRound, LockKeyhole, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";

export function EnrollmentPanel() {
  const snapshot = usePhase1Snapshot();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const child = snapshot.activeChild;
  if (snapshot.connection === "revoked") {
    return (
      <section className="quest-card space-y-3 p-7 text-center">
        <ShieldAlert aria-hidden className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="text-2xl font-extrabold">This device was revoked</h1>
        <p className="text-sm text-muted-foreground">
          New cloud changes are blocked, but saved offline work has not been erased. A parent can
          export it and enroll a replacement device.
        </p>
        <button
          type="button"
          onClick={() => void getPhase1SyncAdapter().exportLocalRecoveryBackup()}
          className="rounded-full border border-border px-4 py-2 font-bold"
        >
          Export encrypted local work
        </button>
      </section>
    );
  }

  if (snapshot.connection === "recovery_required") {
    return (
      <section className="quest-card space-y-3 p-7 text-center">
        <LockKeyhole aria-hidden className="mx-auto h-10 w-10 text-amber-700" />
        <h1 className="text-2xl font-extrabold">Parent recovery required</h1>
        <p className="text-sm text-muted-foreground">
          This installation lost its secure identity. It will not silently create a new child
          account or switch profiles. Local practice remains on this device.
        </p>
        <button
          type="button"
          onClick={() => void getPhase1SyncAdapter().exportLocalRecoveryBackup()}
          className="rounded-full border border-border px-4 py-2 font-bold"
        >
          Export encrypted local work
        </button>
      </section>
    );
  }

  if (child?.device?.state === "active") {
    return (
      <section className="quest-card space-y-3 p-7 text-center">
        <KeyRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
        <h1 className="script-type text-4xl">Paired to {child.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          This installation is permanently assigned to {child.displayName}. Only a signed-in parent
          can revoke or replace it.
        </p>
        <dl className="rounded-2xl border border-border p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Device</dt>
            <dd className="font-bold">{child.device.label}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <dt className="text-muted-foreground">Profile</dt>
            <dd className="font-bold">{child.displayName}</dd>
          </div>
        </dl>
        {snapshot.pendingMigrationCapture && (
          <div className="space-y-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
            <p className="font-extrabold text-amber-950">Parent requested a migration capture</p>
            <p className="text-sm text-amber-950">
              This iPad—not the parent phone—will encrypt and upload its exact local XP, rewards,
              analogy history, and Vocabulary V1 data. Cloud authority will not change yet.
            </p>
            <button
              type="button"
              onClick={() => void getPhase1SyncAdapter().captureRequestedMigration()}
              className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground"
            >
              Capture and export this iPad
            </button>
          </div>
        )}
        {snapshot.pendingRollback && (
          <div className="space-y-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
            <p className="font-extrabold text-amber-950">Parent requested local-only rollback</p>
            <p className="text-sm text-amber-950">
              This first reconciles every queued event, then writes the final cloud XP, rewards,
              goals, redemptions, and visibility into the local cache. Learning state is untouched.
            </p>
            <button
              type="button"
              onClick={() => void getPhase1SyncAdapter().completeRequestedRollback()}
              className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground"
            >
              Reconcile and return to local-only
            </button>
          </div>
        )}
      </section>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().consumeEnrollmentInvite(code.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That invitation could not be used.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="quest-card space-y-5 p-7">
      <div className="text-center">
        <KeyRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
        <h1 className="script-type mt-2 text-4xl">Pair this iPad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask a signed-in parent to create a one-time invitation for the correct child. This screen
          never asks you to choose a child.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="enrollment-code" className="block text-sm font-bold">
          One-time invitation
        </label>
        <input
          id="enrollment-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-[52px] w-full rounded-2xl border border-border bg-secondary/40 px-4 text-center font-mono outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length < 12 || !snapshot.adapterAvailable}
          className="min-h-[48px] w-full rounded-full bg-primary px-5 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Pairing securely…" : "Pair this installation"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Invitations expire quickly, work once, and are locked to the profile selected by the parent.
        A family code or profile name cannot authorize access.
      </p>
    </section>
  );
}
