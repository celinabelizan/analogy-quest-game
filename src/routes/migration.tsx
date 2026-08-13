import { createFileRoute, Link } from "@tanstack/react-router";
import { DoodleField } from "@/components/quest/Doodles";
import { MigrationComparison } from "@/components/sync/MigrationComparison";
import { ParentAuthCard } from "@/components/sync/ParentAuthCard";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { usePhase1Snapshot } from "@/components/sync/bridge";

export const Route = createFileRoute("/migration")({
  head: () => ({ meta: [{ title: "Migration Review — SSAT Quest" }] }),
  component: MigrationRoute,
});

function MigrationRoute() {
  const { parent } = usePhase1Snapshot();
  const signedIn = parent.state === "authenticated" || parent.state === "reauth_required";
  return (
    <main className="relative min-h-screen px-5 py-10">
      <DoodleField seed={2} />
      <div className="relative z-10 mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="script-type text-5xl text-primary">Migration review</h1>
            <p className="text-sm text-muted-foreground">
              Read-only comparison before Test becomes cloud-authoritative
            </p>
          </div>
          <Link to="/parent" className="rounded-full border border-border px-4 py-2 font-bold">
            Done
          </Link>
        </div>
        <SyncStatus />
        {signedIn ? <MigrationComparison /> : <ParentAuthCard />}
      </div>
    </main>
  );
}
