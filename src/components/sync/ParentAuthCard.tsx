import { Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getPhase1SyncAdapter, usePhase1Snapshot } from "./bridge";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function ParentAuthCard() {
  const { parent, adapterAvailable } = usePhase1Snapshot();
  const [email, setEmail] = useState(parent.email ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totp, setTotp] = useState<{ factorId: string; qrCode: string; secret: string } | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState("");

  if (parent.state === "authenticated" || parent.state === "reauth_required") {
    return (
      <section className="quest-card space-y-3 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-1 h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-extrabold">Signed in securely</h2>
            <p className="text-sm text-muted-foreground">{parent.email ?? "Parent account"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {parent.aal === "aal2"
                ? "High-risk actions are unlocked for this session."
                : "Routine parent actions are available. Device and migration changes will ask for your authenticator code."}
            </p>
            {!parent.recoveryReady && (
              <p className="mt-2 text-xs font-bold text-amber-800">
                Before relying on MFA, save two authenticator factors or confirm the recovery
                procedure in Supabase. Losing every factor requires account-owner recovery.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void getPhase1SyncAdapter().signOutParent()}
          className="rounded-full border border-border px-4 py-2 text-sm font-bold"
        >
          Sign out
        </button>
        {parent.aal !== "aal2" && !totp && (
          <button
            type="button"
            onClick={() =>
              void getPhase1SyncAdapter()
                .beginParentTotp()
                .then(setTotp)
                .catch((cause) => setError(messageOf(cause)))
            }
            className="ml-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary"
          >
            Set up authenticator
          </button>
        )}
        {totp && (
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Scan this with your authenticator app</p>
            <img
              src={totp.qrCode}
              alt="Authenticator setup QR code"
              className="mx-auto h-44 w-44"
            />
            <p className="break-all font-mono text-xs">Manual key: {totp.secret}</p>
            <input
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="min-h-[44px] w-full rounded-xl border border-border px-3 text-center"
              placeholder="6-digit code"
            />
            <button
              type="button"
              disabled={totpCode.replace(/\s/g, "").length < 6}
              onClick={() =>
                void getPhase1SyncAdapter()
                  .verifyParentTotp(totp.factorId, totpCode.replace(/\s/g, ""))
                  .then(() => {
                    setTotp(null);
                    setTotpCode("");
                  })
                  .catch((cause) => setError(messageOf(cause)))
              }
              className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
            >
              Verify authenticator
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </section>
    );
  }

  const requestLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await getPhase1SyncAdapter().requestParentMagicLink(email.trim());
      setNotice("Check your email for the secure sign-in link or one-time code.");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().verifyParentOtp(email.trim(), token.replace(/\s/g, ""));
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="quest-card w-full max-w-md space-y-5 p-7">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Mail aria-hidden className="h-6 w-6" />
        </span>
        <h1 className="script-type mt-3 text-4xl">Parent sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the parent email connected to your family. A PIN or family code never grants cloud
          access.
        </p>
      </div>

      <form onSubmit={requestLink} className="space-y-3">
        <label className="block text-sm font-bold" htmlFor="parent-email">
          Parent email
        </label>
        <input
          id="parent-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-[48px] w-full rounded-2xl border border-border bg-secondary/40 px-4 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !adapterAvailable}
          className="min-h-[48px] w-full rounded-full bg-primary px-5 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Sending…" : "Email me a secure link"}
        </button>
      </form>

      {(parent.state === "link_sent" || notice) && (
        <form onSubmit={verifyCode} className="space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">{notice}</p>
          <label className="block text-sm font-bold" htmlFor="parent-otp">
            Or enter the one-time email code
          </label>
          <input
            id="parent-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="min-h-[48px] w-full rounded-2xl border border-border bg-secondary/40 px-4 text-center text-xl tracking-[0.25em] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || token.replace(/\s/g, "").length < 6}
            className="min-h-[48px] w-full rounded-full border border-primary px-5 font-extrabold text-primary disabled:opacity-50"
          >
            Verify code
          </button>
        </form>
      )}

      {!adapterAvailable && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">
          Secure sync is not configured in this local build. Existing local practice data is
          unchanged.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
