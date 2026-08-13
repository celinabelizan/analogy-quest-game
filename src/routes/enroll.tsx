import { createFileRoute, Link } from "@tanstack/react-router";
import { DoodleField } from "@/components/quest/Doodles";
import { EnrollmentPanel } from "@/components/sync/EnrollmentPanel";
import { SyncStatus } from "@/components/sync/SyncStatus";

export const Route = createFileRoute("/enroll")({
  head: () => ({ meta: [{ title: "Pair Child iPad — SSAT Quest" }] }),
  component: EnrollRoute,
});

function EnrollRoute() {
  return (
    <main className="relative min-h-screen px-5 py-10">
      <DoodleField seed={1} />
      <div className="relative z-10 mx-auto max-w-lg space-y-4">
        <SyncStatus />
        <EnrollmentPanel />
        <Link to="/" className="block text-center text-sm font-bold text-muted-foreground">
          ← Back
        </Link>
      </div>
    </main>
  );
}
