import { Copy, KeyRound, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";
import { HighRiskReauth } from "./HighRiskReauth";

type ProtectedAction =
  | { kind: "invite"; profileId: string; label: string }
  | { kind: "revoke"; deviceId: string; reason: string }
  | { kind: "replace"; deviceId: string; reason: string };

export function DeviceManager() {
  const snapshot = usePhase1Snapshot();
  const [profileId, setProfileId] = useState(snapshot.children[0]?.id ?? "");
  const [label, setLabel] = useState("Home Screen iPad");
  const [pendingAction, setPendingAction] = useState<ProtectedAction | null>(null);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profileId && snapshot.children[0]) setProfileId(snapshot.children[0].id);
  }, [profileId, snapshot.children]);

  const run = async (action: ProtectedAction) => {
    setBusy(true);
    setError(null);
    try {
      if (action.kind === "invite") {
        setInvite(
          await getPhase1SyncAdapter().createEnrollmentInvite(action.profileId, action.label),
        );
      } else if (action.kind === "replace") {
        setInvite(
          await getPhase1SyncAdapter().createReplacementInvite(action.deviceId, action.reason),
        );
      } else {
        await getPhase1SyncAdapter().revokeDevice(action.deviceId, action.reason);
      }
      setPendingAction(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The secure device action failed.");
    } finally {
      setBusy(false);
    }
  };

  const requireProtection = (action: ProtectedAction) => {
    if (snapshot.parent.aal === "aal2") void run(action);
    else setPendingAction(action);
  };

  if (snapshot.parent.state === "signed_out" || snapshot.parent.state === "link_sent") {
    return (
      <p className="quest-card p-6 text-sm text-muted-foreground">
        Sign in as the parent before managing child installations.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="quest-card space-y-4 p-6">
        <div className="flex items-start gap-3">
          <KeyRound aria-hidden className="mt-1 h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-extrabold">Enroll a child installation</h2>
            <p className="text-sm text-muted-foreground">
              Creates a profile-specific invitation that expires in ten minutes and works once.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Child profile
            <select
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-border bg-background px-3"
            >
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Device label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-border bg-background px-3"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !profileId || !label.trim()}
          onClick={() => requireProtection({ kind: "invite", profileId, label: label.trim() })}
          className="rounded-full bg-primary px-5 py-3 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          Create one-time invitation
        </button>
        {invite && (
          <div className="rounded-2xl border border-primary bg-primary/10 p-4">
            <p className="text-sm font-bold">Invitation (show only on the intended iPad)</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-background px-3 py-2 text-sm">
                {invite.code}
              </code>
              <button
                type="button"
                aria-label="Copy invitation"
                onClick={() => void navigator.clipboard.writeText(invite.code)}
                className="rounded-full border border-border p-2"
              >
                <Copy aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Expires {new Date(invite.expiresAt).toLocaleString()}
            </p>
          </div>
        )}
      </section>

      <section className="quest-card space-y-4 p-6">
        <h2 className="text-xl font-extrabold">Child installations</h2>
        {snapshot.devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No installations are enrolled.</p>
        ) : (
          <ul className="space-y-3">
            {snapshot.devices.map((device) => (
              <li key={device.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">
                      {device.profileName} — {device.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.lastSeenAt
                        ? `Last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                        : "Never synced"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${device.state === "active" ? "bg-emerald-100 text-emerald-900" : "bg-secondary text-muted-foreground"}`}
                  >
                    {device.state.replaceAll("_", " ")}
                  </span>
                </div>
                {device.state === "active" && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        requireProtection({
                          kind: "revoke",
                          deviceId: device.id,
                          reason: "Parent revoked or replaced device",
                        })
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive px-4 py-2 text-sm font-bold text-destructive"
                    >
                      <ShieldX aria-hidden className="h-4 w-4" /> Revoke
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requireProtection({
                          kind: "replace",
                          deviceId: device.id,
                          reason: "Parent-authorized replacement device",
                        })
                      }
                      className="ml-2 mt-3 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary"
                    >
                      Replace and create invitation
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </section>

      <HighRiskReauth
        open={pendingAction !== null}
        title="Verify this high-risk action"
        explanation="Device enrollment and revocation require your authenticator factor. This prevents a child session from switching profiles or promoting itself."
        onCancel={() => setPendingAction(null)}
        onVerified={() => pendingAction && void run(pendingAction)}
      />
    </div>
  );
}
