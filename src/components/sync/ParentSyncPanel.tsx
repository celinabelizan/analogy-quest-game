import { Link } from "@tanstack/react-router";
import { ParentRewardCenter } from "@/components/rewards/ParentRewardCenter";
import { ParentAuthCard } from "./ParentAuthCard";
import { ParentXpManager } from "./ParentXpManager";
import { SyncStatus } from "./SyncStatus";
import { usePhase1Snapshot } from "./bridge";

export function ParentSyncPanel() {
  const snapshot = usePhase1Snapshot();
  if (!snapshot.adapterAvailable) return null;
  const signedIn =
    snapshot.parent.state === "authenticated" || snapshot.parent.state === "reauth_required";
  return (
    <div className="space-y-5">
      <SyncStatus />
      {!signedIn ? (
        <ParentAuthCard />
      ) : (
        <>
          <section className="quest-card flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <h2 className="text-xl font-extrabold">Secure family sync</h2>
              <p className="text-sm text-muted-foreground">
                Cloud XP and rewards are synchronized. Analogy and Vocabulary V1 learning state
                remain local on each iPad.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/device" className="rounded-full border border-border px-4 py-2 font-bold">
                Child devices
              </Link>
              <Link
                to="/migration"
                className="rounded-full border border-border px-4 py-2 font-bold"
              >
                Migration review
              </Link>
            </div>
          </section>
          <ParentXpManager />
          <ParentRewardCenter />
        </>
      )}
    </div>
  );
}
