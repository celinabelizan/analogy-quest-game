import { createFileRoute, Link } from "@tanstack/react-router";
import { DoodleField } from "@/components/quest/Doodles";
import { ParentAuthCard } from "@/components/sync/ParentAuthCard";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { usePhase1Snapshot } from "@/components/sync/bridge";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Parent Sign In — SSAT Quest" }] }),
  component: ParentAuthRoute,
});

function ParentAuthRoute() {
  const sync = usePhase1Snapshot();
  const childInstallation =
    typeof window !== "undefined" &&
    window.localStorage.getItem("ssatquest.phase1.child-installation") === "true";
  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <DoodleField seed={2} />
      <div className="relative z-10 w-full max-w-md space-y-4">
        <SyncStatus compact />
        {sync.activeChild || childInstallation ? (
          <section className="quest-card p-7 text-center">
            <h1 className="text-2xl font-extrabold">Parent sign-in is blocked here</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the parent portal on a separate phone or computer. This preserves the iPad&apos;s
              permanent child identity.
            </p>
          </section>
        ) : (
          <ParentAuthCard />
        )}
        <Link to="/" className="block text-center text-sm font-bold text-muted-foreground">
          ← Back to profiles
        </Link>
      </div>
    </main>
  );
}
