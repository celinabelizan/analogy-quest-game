import { useSyncExternalStore } from "react";
import type { Phase1Snapshot, Phase1SyncAdapter } from "./model";

const unavailableSnapshot: Phase1Snapshot = {
  adapterAvailable: false,
  connection: "unavailable",
  counts: { pending: 0, needsReview: 0, rejected: 0 },
  parent: { state: "signed_out", aal: "aal1", recoveryReady: false },
  children: [],
  devices: [],
  message: "Secure sync has not been configured on this build.",
};

const bootstrappingSnapshot: Phase1Snapshot = {
  ...unavailableSnapshot,
  adapterAvailable: true,
  connection: "recovery_required",
  message: "Secure sync is loading. Profile access is temporarily locked.",
};

const unavailable = async (): Promise<never> => {
  throw new Error("Secure sync is unavailable in this build.");
};

const fallbackAdapter: Phase1SyncAdapter = {
  getSnapshot: () => unavailableSnapshot,
  subscribe: () => () => undefined,
  requestParentMagicLink: unavailable,
  verifyParentOtp: unavailable,
  beginParentTotp: unavailable,
  verifyParentTotp: unavailable,
  reauthenticateParent: unavailable,
  signOutParent: unavailable,
  retrySync: unavailable,
  createEnrollmentInvite: unavailable,
  consumeEnrollmentInvite: unavailable,
  revokeDevice: unavailable,
  createReplacementInvite: unavailable,
  exportLocalRecoveryBackup: unavailable,
  createRewardProposal: unavailable,
  reviseReward: unavailable,
  parentEditReward: unavailable,
  withdrawRewardRevision: unavailable,
  reviewReward: unavailable,
  archiveReward: unavailable,
  setRewardVisibility: unavailable,
  adjustXp: unavailable,
  awardExitTicket: unavailable,
  setRewardGoal: unavailable,
  requestRedemption: unavailable,
  resolveRedemption: unavailable,
  prepareMigration: unavailable,
  captureRequestedMigration: unavailable,
  getMigrationComparisons: async () => [],
  exportMigrationBackup: unavailable,
  confirmMigration: unavailable,
  requestRollback: unavailable,
  cancelMigrationCapture: unavailable,
  completeRequestedRollback: unavailable,
};

const secureSyncBuild = import.meta.env["VITE_SECURE_SYNC_PHASE1"] === "true";
const bootstrappingAdapter: Phase1SyncAdapter = {
  ...fallbackAdapter,
  getSnapshot: () => bootstrappingSnapshot,
};
let adapter: Phase1SyncAdapter = secureSyncBuild ? bootstrappingAdapter : fallbackAdapter;
const adapterListeners = new Set<() => void>();
let runtimeUnsubscribe = adapter.subscribe(() => {
  adapterListeners.forEach((listener) => listener());
});

/** Called once by the Phase 1 sync runtime. No Supabase client is imported by UI code. */
export function configurePhase1SyncAdapter(next: Phase1SyncAdapter): () => void {
  runtimeUnsubscribe();
  adapter = next;
  runtimeUnsubscribe = adapter.subscribe(() => {
    adapterListeners.forEach((listener) => listener());
  });
  adapterListeners.forEach((listener) => listener());
  return () => {
    if (adapter === next) {
      runtimeUnsubscribe();
      adapter = secureSyncBuild ? bootstrappingAdapter : fallbackAdapter;
      runtimeUnsubscribe = adapter.subscribe(() => {
        adapterListeners.forEach((listener) => listener());
      });
      adapterListeners.forEach((listener) => listener());
    }
  };
}

export function getPhase1SyncAdapter(): Phase1SyncAdapter {
  return adapter;
}

export function usePhase1Snapshot(): Phase1Snapshot {
  return useSyncExternalStore(
    (listener) => {
      adapterListeners.add(listener);
      return () => {
        adapterListeners.delete(listener);
      };
    },
    () => adapter.getSnapshot(),
    () => adapter.getSnapshot(),
  );
}
