import type { RewardStatus } from "@/components/sync/model";

const labels: Record<RewardStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
  redeemed: "Redeemed",
  archived: "Archived",
};

export function RewardStatusBadge({ status }: { status: RewardStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${status === "approved" ? "bg-emerald-100 text-emerald-900" : status === "pending" ? "bg-amber-100 text-amber-950" : "bg-secondary text-muted-foreground"}`}
    >
      {labels[status]}
    </span>
  );
}
