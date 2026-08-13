import { createFileRoute, Link } from "@tanstack/react-router";
import { DoodleField } from "@/components/quest/Doodles";
import { DeviceManager } from "@/components/sync/DeviceManager";
import { ParentAuthCard } from "@/components/sync/ParentAuthCard";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { usePhase1Snapshot } from "@/components/sync/bridge";

export const Route = createFileRoute("/device")({
  head: () => ({ meta: [{ title: "Child Devices — SSAT Quest" }] }),
  component: DeviceRoute,
});

function DeviceRoute() {
  const { parent } = usePhase1Snapshot();
  const childInstallation =
    typeof window !== "undefined" &&
    window.localStorage.getItem("ssatquest.phase1.child-installation") === "true";
  const signedIn = parent.state === "authenticated" || parent.state === "reauth_required";
  return (
    <main className="relative min-h-screen px-5 py-10">
      <DoodleField seed={2} />
      <div className="relative z-10 mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="script-type text-5xl text-primary">Child devices</h1>
          <Link to="/parent" className="rounded-full border border-border px-4 py-2 font-bold">
            Done
          </Link>
        </div>
        <SyncStatus />
        {signedIn ? (
          <DeviceManager />
        ) : childInstallation ? (
          <section className="quest-card p-6 text-center text-sm text-muted-foreground">
            Parent sign-in is blocked on this enrolled child installation. Manage devices from the
            parent portal on a separate phone or computer.
          </section>
        ) : (
          <ParentAuthCard />
        )}
      </div>
    </main>
  );
}
