import { describe, expect, it } from "vitest";
import { childProfileAccess, visibleChildProfiles } from "../../src/components/sync/profile-access";
import type { Phase1Snapshot } from "../../src/components/sync/model";
import { discardEarnsXp } from "../../src/routes/practice.$pid";

const snapshot = (overrides: Partial<Phase1Snapshot> = {}): Phase1Snapshot => ({
  adapterAvailable: true,
  connection: "synced",
  counts: { pending: 0, needsReview: 0, rejected: 0 },
  parent: { state: "signed_out", aal: "aal1", recoveryReady: false },
  children: [],
  devices: [],
  ...overrides,
});

describe("enrolled child profile boundary", () => {
  const bianca = {
    id: "profile-bianca",
    localProfileId: "bianca" as const,
    displayName: "Bianca",
    availableXp: 200,
    lifetimeXp: 200,
    pendingXp: 0,
    needsReviewXp: 0,
    rewardsVisible: false,
    activeRewardVersion: 0,
    rewards: [],
    redemptions: [],
  };

  it("allows only the permanently assigned profile", () => {
    const child = snapshot({ activeChild: bianca });
    expect(childProfileAccess(child, "bianca")).toEqual({
      allowed: true,
      mode: "assigned_child",
    });
    expect(childProfileAccess(child, "calista")).toEqual({
      allowed: false,
      reason: "wrong_profile",
      assignedProfileId: "bianca",
    });
    expect(visibleChildProfiles(child, ["bianca", "calista"])).toEqual(["bianca"]);
  });

  it("fails closed when installation identity is missing or revoked", () => {
    expect(childProfileAccess(snapshot({ connection: "recovery_required" }), "bianca")).toEqual({
      allowed: false,
      reason: "recovery_required",
    });
    expect(childProfileAccess(snapshot({ connection: "revoked" }), "bianca")).toEqual({
      allowed: false,
      reason: "revoked",
    });
  });
});

describe("extra-discard XP regression", () => {
  it("awards wrong-choice discards but never the correct answer discard", () => {
    expect(discardEarnsXp("B", "A")).toBe(true);
    expect(discardEarnsXp("A", "A")).toBe(false);
  });
});
