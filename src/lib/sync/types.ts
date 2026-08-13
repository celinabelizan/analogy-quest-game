export type UUID = string;

export type EvidenceKind =
  | "analogy_type_correct"
  | "analogy_bridge_lock"
  | "analogy_discard"
  | "analogy_final"
  | "analogy_complete"
  | "vocab_answer";

export type OutboxStatus = "pending" | "sending" | "needs_review" | "rejected";

export type XpEvidenceCommand = {
  kind: "xp_evidence";
  eventId: UUID;
  attemptId: UUID;
  deviceSequence: number;
  evidenceKind: EvidenceKind;
  contentId: string;
  contentVersion: 1;
  ruleVersion: 1;
  payload: Record<string, unknown>;
  occurredAt: string;
  offlineAuthorization?: string;
};

export type RewardProposalCommand = {
  kind: "reward_proposal";
  eventId: UUID;
  rewardId: UUID;
  revisionId: UUID;
  profileId: UUID;
  name: string;
  productUrl?: string;
  estimatedPriceCents?: number;
  imageAssetId?: UUID;
};

export type RewardRevisionCommand = {
  kind: "reward_revision";
  eventId: UUID;
  rewardId: UUID;
  revisionId: UUID;
  expectedRewardVersion: number;
  name: string;
  productUrl?: string;
  estimatedPriceCents?: number;
  imageAssetId?: UUID;
};

export type SyncCommand = XpEvidenceCommand | RewardProposalCommand | RewardRevisionCommand;

export type OutboxRecord = {
  eventId: UUID;
  command: SyncCommand;
  status: OutboxStatus;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  serverReceipt?: unknown;
};

export type CloudBalance = {
  profileId: UUID;
  lifetimeXp: number;
  availableXp: number;
  version: number;
  updatedAt: string;
};

export type CloudReward = {
  id: UUID;
  profileId: UUID;
  status: "pending" | "approved" | "declined" | "redeemed" | "archived";
  approvedRevisionId: UUID | null;
  authoritativeXpCost: number | null;
  isReusable: boolean;
  version: number;
};

/** This envelope intentionally has no analogy/vocabulary learning-state fields. */
export type CloudSyncProjection = {
  schemaVersion: 1;
  profileId: UUID;
  serverCursor: string;
  receivedAt: string;
  balance: CloudBalance;
  rewards: CloudReward[];
  activeRewardId: UUID | null;
  rewardVisibility: boolean;
};

export type SyncCache = {
  schemaVersion: 1;
  confirmed?: CloudSyncProjection;
  pendingXp: number;
  reviewXp: number;
  rejectedXp: number;
  updatedAt: string;
};

export type MigrationCandidate = {
  lifetimeXp: number;
  availableXp: number;
  rewards: Array<{
    legacyId: string;
    cloudRewardId: UUID;
    cloudRevisionId: UUID;
    name: string;
    xp: number;
    archivedImported?: boolean;
    legacyPhotoQuarantined?: string;
  }>;
  activeRewardId: string | null;
  redemptions: Array<{
    cloudRedemptionId: UUID;
    rewardId: string;
    name: string;
    cost: number;
    status: "pending" | "approved" | "declined";
    requestedAt: string;
    resolvedAt?: string;
  }>;
  showRewards: boolean;
  xpFacts: {
    completedAnalogyCount: number;
    correctAnalogyCount: number;
    correctStreak: number;
    vocabAnswerCount: number;
    analogyLastCompleted: Array<{ contentId: string; completedOrdinal: number }>;
  };
  vocabBonusFacts: Array<{
    vocabId: string;
    correctContextCount: number;
    masteryBonusAwarded: boolean;
  }>;
  dailyProgressFacts: Array<{
    familyLocalDate: string;
    analogyCompleted: number;
    vocabDone: number;
  }>;
  overlappingDailyClaims: Array<{
    familyLocalDate: string;
    awardKind: "exit_ticket" | "analogy_day_bonus" | "vocab_day_bonus";
  }>;
  localLearningSummary: {
    analogyHistoryCount: number;
    analogyCompletedCount: number;
    hasCurrentDrill: boolean;
    vocabularyWordCount: number;
    vocabularyMasteredCount: number;
    dailyRecordCount: number;
  };
};
