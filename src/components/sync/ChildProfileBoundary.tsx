import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { usePhase1Snapshot } from "./bridge";
import type { LocalProfileId } from "./model";
import { childProfileAccess } from "./profile-access";

export function ChildProfileBoundary({
  requestedProfileId,
  children,
}: {
  requestedProfileId: LocalProfileId;
  children: ReactNode;
}) {
  const snapshot = usePhase1Snapshot();
  const access = childProfileAccess(snapshot, requestedProfileId);
  if (access.allowed) return children;

  const copy = {
    wrong_profile: {
      title: "This profile is not available on this iPad",
      body: "This installation is permanently paired to one child. Changing the web address cannot open another child's data.",
    },
    unpaired: {
      title: "Pair this iPad first",
      body: "A parent must create a one-time invitation for the correct child before practice can open.",
    },
    revoked: {
      title: "This device was revoked",
      body: "Cloud access is blocked. Saved offline work remains available for parent-assisted recovery.",
    },
    recovery_required: {
      title: "Parent recovery required",
      body: "The secure installation identity is missing. The app will not create a new identity or switch children automatically.",
    },
    migration_cutover: {
      title: "Migration snapshot is locked",
      body: "Practice and reward changes are paused after this iPad's exact backup was captured. A parent must confirm the reviewed migration or request rollback before new work resumes.",
    },
    loading: {
      title: "Checking this installation",
      body: "Practice stays locked until the secure child assignment is known.",
    },
  }[access.reason];

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="quest-card w-full max-w-md space-y-4 p-7 text-center">
        <ShieldAlert aria-hidden className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-extrabold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {access.reason === "wrong_profile" && access.assignedProfileId ? (
          <Link
            to="/dashboard/$pid"
            params={{ pid: access.assignedProfileId }}
            className="inline-flex rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Return to my dashboard
          </Link>
        ) : access.reason === "unpaired" ? (
          <Link
            to="/enroll"
            className="inline-flex rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Open secure pairing
          </Link>
        ) : access.reason === "migration_cutover" ? (
          <Link
            to="/enroll"
            className="inline-flex rounded-full border border-border px-5 py-3 font-bold"
          >
            View migration status
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex rounded-full border border-border px-5 py-3 font-bold"
          >
            Back
          </Link>
        )}
      </section>
    </main>
  );
}
