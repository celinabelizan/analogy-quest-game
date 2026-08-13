export type LocalProfileId = "bianca" | "calista" | "test";

export type SyncState =
  | "unavailable"
  | "unpaired"
  | "offline"
  | "pending"
  | "syncing"
  | "synced"
  | "needs_review"
  | "revoked"
  | "recovery_required";

export type ParentAuthState = "signed_out" | "link_sent" | "authenticated" | "reauth_required";

export type RewardStatus =
  "pending" | "approved" | "declined" | "withdrawn" | "redeemed" | "archived";

export type RedemptionStatus = "pending" | "approved" | "declined" | "reversed";

export interface SyncCounts {
  pending: number;
  needsReview: number;
  rejected: number;
}

export interface ParentSessionView {
  state: ParentAuthState;
  email?: string;
  aal: "aal1" | "aal2";
  recoveryReady: boolean;
}

export interface DeviceView {
  id: string;
  label: string;
  profileId: string;
  localProfileId?: LocalProfileId;
  profileName: string;
  state: "active" | "revoked" | "recovery_required";
  lastSeenAt?: string;
  enrolledAt?: string;
}

export interface RewardRevisionView {
  id: string;
  rewardId: string;
  name: string;
  productUrl?: string;
  estimatedPriceCents?: number;
  imageUrl?: string;
  imageStatus: "none" | "waiting_for_connection" | "uploading" | "ready" | "failed";
  status: RewardStatus;
  authoritativeXpCost?: number;
  oneTime: boolean;
  createdAt: string;
  isCurrentApproved: boolean;
  hasPendingRevision: boolean;
  version: number;
}

export interface RedemptionView {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  status: RedemptionStatus;
  requestedAt: string;
  version: number;
}

export interface ChildCloudView {
  id: string;
  localProfileId?: LocalProfileId;
  displayName: string;
  availableXp: number;
  lifetimeXp: number;
  balanceVersion: number;
  pendingXp: number;
  needsReviewXp: number;
  rewardsVisible: boolean;
  activeRewardId?: string;
  activeRewardVersion: number;
  rewards: RewardRevisionView[];
  redemptions: RedemptionView[];
  device?: DeviceView;
}

export interface Phase1Snapshot {
  adapterAvailable: boolean;
  connection: SyncState;
  counts: SyncCounts;
  parent: ParentSessionView;
  activeChild?: ChildCloudView;
  children: ChildCloudView[];
  devices: DeviceView[];
  lastSyncedAt?: string;
  message?: string;
  /** False/omitted until the separate production migration gate is explicitly enabled. */
  realProfileMigrationEnabled?: boolean;
}

export interface RewardDraft {
  name: string;
  productUrl?: string;
  estimatedPriceCents?: number;
  image?: File;
}

export interface ParentRewardDecision {
  revisionId: string;
  decision: "approve" | "decline";
  finalName?: string;
  finalProductUrl?: string;
  finalEstimatedPriceCents?: number;
  authoritativeXpCost?: number;
  oneTime?: boolean;
  reason: string;
  expectedVersion: number;
}

export interface MigrationDomainComparison {
  domain: "xp" | "rewards" | "redemptions" | "analogy" | "vocabulary";
  localSummary: string;
  cloudSummary: string;
  resolution: string;
  state: "match" | "local_only" | "cloud_only" | "conflict" | "preserved_local";
}

export interface MigrationComparisonView {
  sessionId: string;
  profileId: string;
  localProfileId: LocalProfileId;
  profileName: string;
  sourceHash: string;
  backupState: "not_created" | "local_only" | "encrypted_export_ready" | "uploaded_encrypted";
  migrationState: "comparison" | "staged" | "confirmed_cloud";
  rows: MigrationDomainComparison[];
  localLifetimeXp: number;
  localAvailableXp: number;
  cloudLifetimeXp: number;
  cloudAvailableXp: number;
  unresolvedConflicts: number;
  confirmationPhrase: string;
}

export interface Phase1SyncAdapter {
  getSnapshot(): Phase1Snapshot;
  subscribe(listener: () => void): () => void;
  requestParentMagicLink(email: string): Promise<void>;
  verifyParentOtp(email: string, token: string): Promise<void>;
  beginParentTotp(): Promise<{ factorId: string; qrCode: string; secret: string }>;
  verifyParentTotp(factorId: string, code: string): Promise<void>;
  reauthenticateParent(code: string): Promise<void>;
  signOutParent(): Promise<void>;
  retrySync(): Promise<void>;
  createEnrollmentInvite(
    profileId: string,
    deviceLabel: string,
  ): Promise<{ code: string; expiresAt: string }>;
  consumeEnrollmentInvite(code: string): Promise<void>;
  revokeDevice(deviceId: string, reason: string): Promise<void>;
  createReplacementInvite(
    deviceId: string,
    reason: string,
  ): Promise<{ code: string; expiresAt: string }>;
  exportLocalRecoveryBackup(): Promise<void>;
  createRewardProposal(draft: RewardDraft): Promise<void>;
  reviseReward(rewardId: string, draft: RewardDraft): Promise<void>;
  parentEditReward(
    rewardId: string,
    draft: RewardDraft,
    authoritativeXpCost: number,
    oneTime: boolean,
    reason: string,
    expectedVersion: number,
  ): Promise<void>;
  withdrawRewardRevision(revisionId: string): Promise<void>;
  reviewReward(decision: ParentRewardDecision): Promise<void>;
  archiveReward(rewardId: string, reason: string): Promise<void>;
  setRewardVisibility(profileId: string, visible: boolean, reason: string): Promise<void>;
  adjustXp(
    profileId: string,
    mode: "add" | "subtract" | "set_exact",
    amount: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<void>;
  awardExitTicket(profileId: string, reason: string, idempotencyKey: string): Promise<void>;
  setRewardGoal(rewardId: string, expectedVersion: number): Promise<void>;
  requestRedemption(rewardId: string, expectedVersion: number): Promise<void>;
  resolveRedemption(
    redemptionId: string,
    decision: "approve" | "decline",
    reason: string,
  ): Promise<void>;
  prepareMigration(localProfileId: LocalProfileId): Promise<void>;
  getMigrationComparisons(): Promise<MigrationComparisonView[]>;
  exportMigrationBackup(sessionId: string): Promise<void>;
  confirmMigration(sessionId: string, confirmationPhrase: string): Promise<void>;
}
