import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { getPhase1SyncAdapter } from "./bridge";

export function HighRiskReauth({
  open,
  title,
  explanation,
  onVerified,
  onCancel,
}: {
  open: boolean;
  title: string;
  explanation: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await getPhase1SyncAdapter().reauthenticateParent(code.replace(/\s/g, ""));
      onVerified();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-title"
    >
      <form onSubmit={submit} className="quest-card w-full max-w-sm space-y-4 p-7">
        <ShieldCheck aria-hidden className="h-8 w-8 text-primary" />
        <h2 id="reauth-title" className="text-2xl font-extrabold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{explanation}</p>
        <label htmlFor="authenticator-code" className="block text-sm font-bold">
          Authenticator code
        </label>
        <input
          id="authenticator-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-[52px] w-full rounded-2xl border border-border bg-secondary/40 px-4 text-center text-2xl tracking-[0.35em] outline-none focus:border-primary"
        />
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-full border border-border px-4 font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || code.replace(/\s/g, "").length < 6}
            className="min-h-[48px] flex-1 rounded-full bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
