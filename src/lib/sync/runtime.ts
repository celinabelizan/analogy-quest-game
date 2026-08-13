import { configurePhase1SyncAdapter } from "@/components/sync/bridge";
import type {
  ChildCloudView,
  DeviceView,
  MigrationComparisonView,
  ParentRewardDecision,
  Phase1Snapshot,
  Phase1SyncAdapter,
  RewardDraft,
  RewardRevisionView,
} from "@/components/sync/model";
import { supabase } from "@/integrations/supabase/client";
import { enrollTotp, mfaRecoveryReady, sendParentMagicLink, verifyTotp } from "@/lib/auth/parent";
import { ensureAnonymousChildIdentity } from "@/lib/auth/child";
import { buildMigrationCandidate, createRawMigrationArchive, migrationHashes } from "./migration";
import { markCloudAuthoritative } from "./evidence";
import { allOutbox, enqueue } from "./outbox";
import {
  deleteAttemptToken,
  deletePendingImage,
  listAttemptTokens,
  listPendingImages,
  putAttemptTokens,
  putPendingImage,
} from "./indexed-db";
import { flushOutbox } from "./client";
import { validateProductUrl, validateRewardImageMetadata } from "./reward-validation";
import type { OutboxRecord } from "./types";
import { applyCloudBalanceCache } from "@/lib/quest-store";

const enabled = import.meta.env["VITE_SECURE_SYNC_PHASE1"] === "true";
const localProfile = (id: unknown) =>
  id === "bianca" || id === "calista" || id === "test" ? id : undefined;
const uuid = () => crypto.randomUUID();
const value = <T>(row: Record<string, unknown>, key: string, fallback: T) =>
  (row[key] ?? fallback) as T;
const realMigrationEnabled = import.meta.env["VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION"] === "true";
const childInstallationKey = "ssatquest.phase1.child-installation";
const hasChildInstallation = () => localStorage.getItem(childInstallationKey) === "true";

async function imageMetadata(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image cannot be decoded"));
      image.src = url;
    });
    return validateRewardImageMetadata({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      ...dimensions,
      magicBytes: new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function initialSnapshot(): Phase1Snapshot {
  return {
    adapterAvailable: true,
    connection: hasChildInstallation()
      ? "recovery_required"
      : navigator.onLine
        ? "unpaired"
        : "offline",
    counts: { pending: 0, needsReview: 0, rejected: 0 },
    parent: { state: "signed_out", aal: "aal1", recoveryReady: false },
    children: [],
    devices: [],
  };
}

const cachedChildKey = "ssatquest.phase1.cached-child-view";
function readCachedChild(): ChildCloudView | undefined {
  try {
    return JSON.parse(localStorage.getItem(cachedChildKey) ?? "null") as ChildCloudView | undefined;
  } catch {
    return undefined;
  }
}

type RuntimeRewardRevision = RewardRevisionView & { imageAssetId?: string };

function latestRevisions(
  items: Record<string, unknown>[],
  revisions: Record<string, unknown>[],
): RuntimeRewardRevision[] {
  return items.flatMap((item) => {
    const all = revisions.filter((revision) => revision["reward_id"] === item["id"]);
    const pending = all.find((revision) => revision["status"] === "pending");
    const approved = all.find((revision) => revision["id"] === item["approved_revision_id"]);
    const selected =
      approved && pending && approved["id"] !== pending["id"]
        ? [approved, pending]
        : ([pending ?? approved ?? all.at(-1)].filter(Boolean) as Record<string, unknown>[]);
    return selected.map((revision) => ({
      id: String(revision["id"]),
      rewardId: String(item["id"]),
      name: String(revision["name"]),
      ...(revision["product_url"] ? { productUrl: String(revision["product_url"]) } : {}),
      ...(revision["estimated_price_cents"] != null
        ? { estimatedPriceCents: Number(revision["estimated_price_cents"]) }
        : {}),
      imageStatus: revision["image_asset_id"] ? "ready" : "none",
      ...(revision["image_asset_id"] ? { imageAssetId: String(revision["image_asset_id"]) } : {}),
      status: String(revision["status"] ?? item["status"]) as RewardRevisionView["status"],
      ...(item["authoritative_xp_cost"] != null
        ? { authoritativeXpCost: Number(item["authoritative_xp_cost"]) }
        : {}),
      oneTime: item["is_reusable"] !== true,
      createdAt: String(revision["created_at"] ?? ""),
      isCurrentApproved: revision["id"] === item["approved_revision_id"],
      hasPendingRevision: Boolean(pending),
      version: Number(item["version"] ?? 0),
    }));
  });
}

async function hydrateImageUrls(rewards: RuntimeRewardRevision[]) {
  return Promise.all(
    rewards.map(async (reward): Promise<RewardRevisionView> => {
      if (!reward.imageAssetId || !navigator.onLine) return reward;
      try {
        const uploaded = await supabase.functions.invoke("reward-image-url", {
          body: { assetId: reward.imageAssetId },
        });
        if (uploaded.error) throw uploaded.error;
        const signedUrl = (uploaded.data as Record<string, unknown> | null)?.["signedUrl"];
        return typeof signedUrl === "string" ? { ...reward, imageUrl: signedUrl } : reward;
      } catch {
        return { ...reward, imageStatus: "failed" };
      }
    }),
  );
}

function withQueuedRewards(
  confirmed: RewardRevisionView[],
  records: OutboxRecord[],
  pendingImages: Awaited<ReturnType<typeof listPendingImages>>,
  profileId: string,
): RewardRevisionView[] {
  const result = [...confirmed];
  for (const record of records) {
    if (record.status === "rejected") continue;
    const command = record.command;
    if (command.kind === "reward_proposal" && command.profileId === profileId) {
      const image = pendingImages.find((item) => item.revisionId === command.revisionId);
      result.push({
        id: command.revisionId,
        rewardId: command.rewardId,
        name: command.name,
        ...(command.productUrl ? { productUrl: command.productUrl } : {}),
        ...(command.estimatedPriceCents != null
          ? { estimatedPriceCents: command.estimatedPriceCents }
          : {}),
        imageStatus: image ? "waiting_for_connection" : "none",
        status: "pending",
        oneTime: true,
        createdAt: record.createdAt,
        isCurrentApproved: false,
        hasPendingRevision: true,
        version: 0,
      });
      continue;
    }
    if (command.kind !== "reward_revision") continue;
    const index = result.findIndex(
      (reward) => reward.rewardId === command.rewardId && !reward.isCurrentApproved,
    );
    const approved = result.find(
      (reward) => reward.rewardId === command.rewardId && reward.isCurrentApproved,
    );
    if (index < 0 && approved) {
      const image = pendingImages.find((item) => item.revisionId === command.revisionId);
      result.push({
        ...approved,
        id: command.revisionId,
        name: command.name,
        ...(command.productUrl ? { productUrl: command.productUrl } : {}),
        ...(command.estimatedPriceCents != null
          ? { estimatedPriceCents: command.estimatedPriceCents }
          : {}),
        imageStatus: image ? "waiting_for_connection" : "none",
        status: "pending",
        createdAt: record.createdAt,
        isCurrentApproved: false,
        hasPendingRevision: true,
      });
      const approvedIndex = result.findIndex((reward) => reward.id === approved.id);
      result[approvedIndex] = { ...approved, hasPendingRevision: true };
      continue;
    }
    if (index < 0) continue;
    const prior = result[index]!;
    const {
      productUrl: _priorProductUrl,
      estimatedPriceCents: _priorEstimatedPriceCents,
      ...priorWithoutEditableOptionals
    } = prior;
    const image = pendingImages.find((item) => item.revisionId === command.revisionId);
    result[index] = {
      ...priorWithoutEditableOptionals,
      id: command.revisionId,
      name: command.name,
      ...(command.productUrl ? { productUrl: command.productUrl } : {}),
      ...(command.estimatedPriceCents != null
        ? { estimatedPriceCents: command.estimatedPriceCents }
        : {}),
      imageStatus: image ? "waiting_for_connection" : prior.imageStatus,
      status: "pending",
      createdAt: record.createdAt,
      isCurrentApproved: false,
      hasPendingRevision: true,
    };
  }
  return result;
}

export function createPhase1SyncRuntime(): Phase1SyncAdapter {
  let snapshot = initialSnapshot();
  const listeners = new Set<() => void>();
  const migrationRows = new Map<string, Record<string, unknown>>();
  const migrationRecoveryKeys = new Map<string, string>();
  const migrationBlobs = new Map<string, Blob>();
  let latestRefresh = 0;
  let retryInFlight: Promise<void> | undefined;
  const emit = () => listeners.forEach((listener) => listener());
  const set = (patch: Partial<Phase1Snapshot>) => {
    snapshot = { ...snapshot, ...patch };
    emit();
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(name as never, args as never);
    if (error) throw error;
    return data as unknown;
  };
  const invoke = async (name: string, body: BodyInit) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw error;
    return data as Record<string, unknown>;
  };

  async function refresh() {
    if (!enabled) return;
    const generation = ++latestRefresh;
    const { data: sessionData } = await supabase.auth.getSession(),
      session = sessionData.session;
    const outbox = await allOutbox(),
      pendingImages = await listPendingImages(),
      counts = {
        pending: outbox.filter((x) => x.status === "pending" || x.status === "sending").length,
        needsReview: outbox.filter((x) => x.status === "needs_review").length,
        rejected: outbox.filter((x) => x.status === "rejected").length,
      };
    if (!session) {
      const hadAuthority = Boolean(localStorage.getItem("ssatquest.phase1.cloud-authority"));
      set({
        counts,
        connection: hadAuthority ? "recovery_required" : navigator.onLine ? "unpaired" : "offline",
        parent: { state: "signed_out", aal: "aal1", recoveryReady: false },
        children: [],
        devices: [],
        ...(hadAuthority
          ? { message: "Parent recovery required after local identity was cleared." }
          : {}),
      });
      return;
    }
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      recovery = await mfaRecoveryReady().catch(() => false);
    const { data: memberships } = await supabase
      .from("parent_memberships")
      .select("family_id")
      .eq("auth_user_id", session.user.id)
      .is("revoked_at", null);
    const parentFamily = (memberships as Record<string, unknown>[] | null)?.[0]?.["family_id"] as
      string | undefined;
    const children: ChildCloudView[] = [];
    let devices: DeviceView[] = [];
    if (parentFamily) {
      const [{ data: profiles }, { data: assignments }, { data: settings }] = await Promise.all([
        supabase
          .from("child_profiles")
          .select("*")
          .eq("family_id", parentFamily)
          .is("archived_at", null),
        supabase.from("device_assignments").select("*").eq("family_id", parentFamily),
        supabase
          .from("family_reward_settings")
          .select("*")
          .eq("family_id", parentFamily)
          .maybeSingle(),
      ]);
      for (const profile of (profiles ?? []) as Record<string, unknown>[]) {
        const [
          { data: balance },
          { data: items },
          { data: revisions },
          { data: goals },
          { data: redemptions },
        ] = await Promise.all([
          supabase
            .from("profile_balances")
            .select("*")
            .eq("profile_id", String(profile["id"]))
            .maybeSingle(),
          supabase.from("reward_items").select("*").eq("profile_id", String(profile["id"])),
          supabase.from("reward_revisions").select("*").eq("profile_id", String(profile["id"])),
          supabase
            .from("reward_goals")
            .select("*")
            .eq("profile_id", String(profile["id"]))
            .maybeSingle(),
          supabase.from("redemption_requests").select("*").eq("profile_id", String(profile["id"])),
        ]);
        const mappedLocal = localProfile(profile["local_profile_id"]);
        const profileId = String(profile["id"]);
        const cloudRewards = await hydrateImageUrls(
          latestRevisions(
            (items ?? []) as Record<string, unknown>[],
            (revisions ?? []) as Record<string, unknown>[],
          ),
        );
        children.push({
          id: profileId,
          ...(mappedLocal ? { localProfileId: mappedLocal } : {}),
          displayName: String(profile["display_name"]),
          availableXp: Number((balance as Record<string, unknown> | null)?.["available_xp"] ?? 0),
          lifetimeXp: Number((balance as Record<string, unknown> | null)?.["lifetime_xp"] ?? 0),
          balanceVersion: Number((balance as Record<string, unknown> | null)?.["version"] ?? 0),
          pendingXp: 0,
          needsReviewXp: 0,
          rewardsVisible: Boolean((settings as Record<string, unknown> | null)?.["show_rewards"]),
          activeRewardVersion: Number((goals as Record<string, unknown> | null)?.["version"] ?? 0),
          ...(goals && (goals as Record<string, unknown>)["reward_id"]
            ? { activeRewardId: String((goals as Record<string, unknown>)["reward_id"]) }
            : {}),
          rewards: withQueuedRewards(cloudRewards, outbox, pendingImages, profileId),
          redemptions: ((redemptions ?? []) as Record<string, unknown>[]).map((r) => ({
            id: String(r["id"]),
            rewardId: String(r["reward_id"]),
            rewardName: String(r["reward_name_snapshot"]),
            cost: Number(r["xp_cost_snapshot"]),
            status: String(r["status"]) as "pending" | "approved" | "declined" | "reversed",
            requestedAt: String(r["requested_at"]),
            version: Number(r["version"] ?? 0),
          })),
        });
      }
      devices = ((assignments ?? []) as Record<string, unknown>[]).map((a) => {
        const child = children.find((c) => c.id === a["profile_id"]);
        return {
          id: String(a["id"]),
          label: String(a["installation_label"] ?? "Child installation"),
          profileId: String(a["profile_id"]),
          ...(child?.localProfileId ? { localProfileId: child.localProfileId } : {}),
          profileName: child?.displayName ?? "Child",
          state: a["status"] === "active" ? "active" : "revoked",
          ...(a["last_seen_at"] ? { lastSeenAt: String(a["last_seen_at"]) } : {}),
          enrolledAt: String(a["enrolled_at"] ?? ""),
        } as DeviceView;
      });
      const aal = assurance.data?.currentLevel === "aal2" ? "aal2" : "aal1";
      if (generation !== latestRefresh) return;
      set({
        counts,
        parent: {
          state: "authenticated",
          ...(session.user.email ? { email: session.user.email } : {}),
          aal,
          recoveryReady: recovery,
        },
        children,
        devices,
        connection: navigator.onLine
          ? counts.needsReview
            ? "needs_review"
            : counts.pending
              ? "pending"
              : "synced"
          : "offline",
        lastSyncedAt: new Date().toISOString(),
        realProfileMigrationEnabled: realMigrationEnabled,
      });
    } else {
      const { data: assignment, error: assignmentError } = await supabase
        .from("device_assignments")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (assignmentError && !navigator.onLine) {
        const child = readCachedChild();
        if (child && generation === latestRefresh)
          set({
            counts,
            activeChild: child,
            children: [child],
            devices: child.device ? [child.device] : [],
            connection: "offline",
            message: "Using the last confirmed cloud cache while offline.",
          });
        return;
      }
      if (!assignment) {
        set({
          counts,
          connection: "unpaired",
          parent: { state: "signed_out", aal: "aal1", recoveryReady: false },
          children: [],
          devices: [],
        });
        return;
      }
      if ((assignment as Record<string, unknown>)["status"] !== "active") {
        set({ counts, connection: "revoked", children: [], devices: [] });
        return;
      }
      const projection = (await rpc("get_phase1_projection", { p_profile_id: null })) as Record<
        string,
        unknown
      >;
      const profileId = String(projection["profileId"]),
        { data: profile } = await supabase
          .from("child_profiles")
          .select("*")
          .eq("id", profileId)
          .single();
      const b = value<Record<string, unknown>>(projection, "balance", {}),
        items = value<Record<string, unknown>[]>(projection, "rewards", []),
        revisions = value<Record<string, unknown>[]>(projection, "revisions", []);
      const mappedLocal = localProfile((profile as Record<string, unknown>)["local_profile_id"]);
      const cloudRewards = await hydrateImageUrls(latestRevisions(items, revisions));
      const assignmentRow = assignment as Record<string, unknown>;
      const device: DeviceView = {
        id: String(assignmentRow["id"]),
        label: String(assignmentRow["installation_label"] ?? "Child installation"),
        profileId,
        ...(mappedLocal ? { localProfileId: mappedLocal } : {}),
        profileName: String((profile as Record<string, unknown>)["display_name"]),
        state: "active",
        ...(assignmentRow["last_seen_at"]
          ? { lastSeenAt: String(assignmentRow["last_seen_at"]) }
          : {}),
        enrolledAt: String(assignmentRow["enrolled_at"] ?? ""),
      };
      const child: ChildCloudView = {
        id: profileId,
        ...(mappedLocal ? { localProfileId: mappedLocal } : {}),
        displayName: String((profile as Record<string, unknown>)["display_name"]),
        availableXp: Number(b["available_xp"] ?? 0),
        lifetimeXp: Number(b["lifetime_xp"] ?? 0),
        balanceVersion: Number(b["version"] ?? 0),
        pendingXp: 0,
        needsReviewXp: 0,
        rewardsVisible: Boolean(projection["rewardVisibility"]),
        activeRewardVersion: Number(projection["activeRewardVersion"] ?? 0),
        ...(projection["activeRewardId"]
          ? { activeRewardId: String(projection["activeRewardId"]) }
          : {}),
        rewards: withQueuedRewards(cloudRewards, outbox, pendingImages, profileId),
        redemptions: value<Record<string, unknown>[]>(projection, "redemptions", []).map((r) => ({
          id: String(r["id"]),
          rewardId: String(r["reward_id"]),
          rewardName: String(r["reward_name_snapshot"]),
          cost: Number(r["xp_cost_snapshot"]),
          status: String(r["status"]) as "pending" | "approved" | "declined" | "reversed",
          requestedAt: String(r["requested_at"]),
          version: Number(r["version"] ?? 0),
        })),
        device,
      };
      if (generation !== latestRefresh) return;
      localStorage.setItem(childInstallationKey, "true");
      localStorage.setItem(cachedChildKey, JSON.stringify(child));
      if (!outbox.some((record) => record.command.kind === "xp_evidence")) {
        if (child.localProfileId)
          applyCloudBalanceCache(child.localProfileId, {
            lifetimeXp: child.lifetimeXp,
            availableXp: child.availableXp,
            version: child.balanceVersion,
          });
      }
      set({
        counts,
        activeChild: child,
        children: [child],
        devices: [device],
        connection: navigator.onLine ? (counts.pending ? "pending" : "synced") : "offline",
        lastSyncedAt: new Date().toISOString(),
      });
    }
  }

  async function uploadWaitingImages() {
    if (!navigator.onLine) return;
    for (const image of await listPendingImages()) {
      try {
        const form = new FormData();
        form.set("file", image.blob);
        form.set("rewardId", image.rewardId);
        form.set("profileId", image.profileId);
        const uploaded = await invoke("reward-image-upload", form);
        await rpc("attach_reward_image", {
          p_revision_id: image.revisionId,
          p_image_asset_id: uploaded["assetId"],
          p_expected_reward_version: image.expectedRewardVersion,
          p_idempotency_key: uuid(),
        });
        await deletePendingImage(image.id);
      } catch {
        /* Retain blob for explicit retry/reselection. */
      }
    }
  }
  async function refillAttemptTokens() {
    if (!navigator.onLine || !snapshot.activeChild) return;
    const current = await listAttemptTokens();
    if (current.length >= 50) return;
    const issued = (await rpc("issue_offline_attempt_authorizations", {
      p_count: Math.min(200, 250 - current.length),
    })) as Record<string, unknown>[];
    await putAttemptTokens(
      issued.map((row) => ({
        tokenId: String(row["token_id"]),
        secret: String(row["token_secret"]),
        expiresAt: String(row["expires_at"]),
      })),
    );
  }
  const mutate = async (fn: () => Promise<unknown>) => {
    await fn();
    await refresh();
  };
  void refresh();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async requestParentMagicLink(email) {
      if (hasChildInstallation())
        throw new Error("Parent sign-in is blocked on an enrolled child installation");
      await sendParentMagicLink(email, `${location.origin}/auth`);
      set({ parent: { ...snapshot.parent, state: "link_sent", email } });
    },
    async verifyParentOtp(email, token) {
      if (hasChildInstallation())
        throw new Error("Parent sign-in is blocked on an enrolled child installation");
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      await refresh();
    },
    async beginParentTotp() {
      const factor = await enrollTotp("SSAT Quest parent");
      return { factorId: factor.id, qrCode: factor.totp.qr_code, secret: factor.totp.secret };
    },
    async verifyParentTotp(factorId, code) {
      await verifyTotp(factorId, code);
      await refresh();
    },
    async reauthenticateParent(code) {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const factor = data.totp.find((x) => x.status === "verified");
      if (!factor) throw new Error("No verified TOTP factor");
      const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verified.error) throw verified.error;
      await refresh();
    },
    async signOutParent() {
      await supabase.auth.signOut({ scope: "local" });
      await refresh();
    },
    async retrySync() {
      if (retryInFlight) return retryInFlight;
      retryInFlight = (async () => {
        set({ connection: "syncing" });
        await flushOutbox(async (record) => {
          const command = record.command;
          if (
            command.kind === "xp_evidence" &&
            (command.evidenceKind === "analogy_complete" ||
              command.evidenceKind === "vocab_answer") &&
            command.offlineAuthorization
          ) {
            const token = (await listAttemptTokens()).find(
              (x) => x.secret === command.offlineAuthorization,
            );
            if (token) await deleteAttemptToken(token.tokenId);
          }
        });
        await uploadWaitingImages();
        await refresh();
        await refillAttemptTokens();
      })().finally(() => {
        retryInFlight = undefined;
      });
      return retryInFlight;
    },
    async createEnrollmentInvite(profileId, deviceLabel) {
      const data = (await rpc("create_enrollment_invitation", {
        p_profile_id: profileId,
        p_installation_label: deviceLabel,
      })) as Record<string, unknown>[];
      return {
        code: String(data[0]?.["invitation_secret"]),
        expiresAt: String(data[0]?.["expires_at"]),
      };
    },
    async consumeEnrollmentInvite(code) {
      await ensureAnonymousChildIdentity();
      const assignment = await rpc("consume_enrollment_invitation", {
        p_invitation_secret: code,
        p_installation_label: "Home Screen iPad",
      });
      if (!assignment) throw new Error("Invalid or expired invitation");
      localStorage.setItem(childInstallationKey, "true");
      await refresh();
    },
    async revokeDevice(deviceId, reason) {
      await mutate(() =>
        rpc("revoke_device", {
          p_assignment_id: deviceId,
          p_reason: reason,
          p_replacement_assignment_id: null,
        }),
      );
    },
    async createReplacementInvite(deviceId, reason) {
      const data = (await rpc("create_replacement_invitation", {
        p_assignment_id: deviceId,
        p_reason: reason,
      })) as Record<string, unknown>[];
      await refresh();
      return {
        code: String(data[0]?.["invitation_secret"]),
        expiresAt: String(data[0]?.["expires_at"]),
      };
    },
    async exportLocalRecoveryBackup() {
      const archive = await createRawMigrationArchive(`recovery-${uuid()}`);
      const download = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };
      download(archive.encrypted.blob, `ssatquest-local-recovery-${Date.now()}.aesgcm`);
      download(
        new Blob([archive.encrypted.recoveryKey], { type: "text/plain" }),
        `ssatquest-local-recovery-${Date.now()}.key.txt`,
      );
    },
    async createRewardProposal(draft) {
      const child = snapshot.activeChild;
      if (!child) throw new Error("An active enrolled child installation is required");
      if (draft.productUrl) validateProductUrl(draft.productUrl);
      if (draft.image) await imageMetadata(draft.image);
      const rewardId = uuid(),
        revisionId = uuid(),
        eventId = uuid();
      await enqueue({
        kind: "reward_proposal",
        eventId,
        rewardId,
        revisionId,
        profileId: child.id,
        name: draft.name,
        ...(draft.productUrl ? { productUrl: draft.productUrl } : {}),
        ...(draft.estimatedPriceCents != null
          ? { estimatedPriceCents: draft.estimatedPriceCents }
          : {}),
      });
      if (draft.image) {
        await putPendingImage({
          id: uuid(),
          blob: draft.image,
          profileId: child.id,
          rewardId,
          revisionId,
          expectedRewardVersion: 0,
          createdAt: new Date().toISOString(),
          status: "waiting",
        });
      }
      await this.retrySync();
    },
    async reviseReward(rewardId, draft) {
      const child = snapshot.activeChild;
      if (!child) throw new Error("An active enrolled child installation is required");
      const reward = child.rewards.find((r) => r.rewardId === rewardId);
      if (!reward) throw new Error("Reward not found");
      if (draft.productUrl) validateProductUrl(draft.productUrl);
      if (draft.image) await imageMetadata(draft.image);
      const revisionId = uuid();
      await enqueue({
        kind: "reward_revision",
        eventId: uuid(),
        rewardId,
        revisionId,
        expectedRewardVersion: reward.version,
        name: draft.name,
        ...(draft.productUrl ? { productUrl: draft.productUrl } : {}),
        ...(draft.estimatedPriceCents != null
          ? { estimatedPriceCents: draft.estimatedPriceCents }
          : {}),
      });
      if (draft.image) {
        await putPendingImage({
          id: uuid(),
          blob: draft.image,
          profileId: child.id,
          rewardId,
          revisionId,
          expectedRewardVersion: reward.version + 1,
          createdAt: new Date().toISOString(),
          status: "waiting",
        });
      }
      await this.retrySync();
    },
    async parentEditReward(rewardId, draft, cost, oneTime, reason, version) {
      const revisionId = uuid();
      await rpc("submit_reward_revision", {
        p_reward_id: rewardId,
        p_revision_id: revisionId,
        p_expected_reward_version: version,
        p_name: draft.name,
        p_product_url: draft.productUrl ?? null,
        p_estimated_price_cents: draft.estimatedPriceCents ?? null,
        p_image_asset_id: null,
        p_idempotency_key: uuid(),
      });
      await mutate(() =>
        rpc("review_reward_revision", {
          p_revision_id: revisionId,
          p_decision: "approve",
          p_final_name: draft.name,
          p_final_product_url: draft.productUrl ?? null,
          p_final_estimated_price_cents: draft.estimatedPriceCents ?? null,
          p_authoritative_xp_cost: cost,
          p_is_reusable: !oneTime,
          p_review_note: reason,
          p_expected_reward_version: version + 1,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async withdrawRewardRevision(id) {
      const reward =
        snapshot.activeChild?.rewards.find((r) => r.id === id) ??
        snapshot.children.flatMap((c) => c.rewards).find((r) => r.id === id);
      await mutate(() =>
        rpc("withdraw_reward_revision", {
          p_revision_id: id,
          p_expected_reward_version: reward?.version ?? 0,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async reviewReward(d: ParentRewardDecision) {
      await mutate(() =>
        rpc("review_reward_revision", {
          p_revision_id: d.revisionId,
          p_decision: d.decision,
          p_final_name: d.finalName ?? null,
          p_final_product_url: d.finalProductUrl ?? null,
          p_final_estimated_price_cents: d.finalEstimatedPriceCents ?? null,
          p_authoritative_xp_cost: d.authoritativeXpCost ?? null,
          p_is_reusable: !(d.oneTime ?? true),
          p_review_note: d.reason,
          p_expected_reward_version: d.expectedVersion,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async archiveReward(rewardId, reason) {
      const reward = snapshot.children
        .flatMap((c) => c.rewards)
        .find((r) => r.rewardId === rewardId);
      await mutate(() =>
        rpc("archive_reward", {
          p_reward_id: rewardId,
          p_expected_reward_version: reward?.version ?? 0,
          p_reason: reason,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async setRewardVisibility(profileId, visible, reason) {
      void reason;
      const family = (
        await supabase.from("child_profiles").select("family_id").eq("id", profileId).single()
      ).data as Record<string, unknown>;
      const familyId = String(family["family_id"]);
      const settings = (
        await supabase
          .from("family_reward_settings")
          .select("version")
          .eq("family_id", familyId)
          .maybeSingle()
      ).data as Record<string, unknown> | null;
      await mutate(() =>
        rpc("set_reward_visibility", {
          p_family_id: familyId,
          p_show_rewards: visible,
          p_expected_version: Number(settings?.["version"] ?? 0),
          p_idempotency_key: uuid(),
        }),
      );
    },
    async adjustXp(profileId, mode, amount, reason, idempotencyKey) {
      if (mode === "set_exact") {
        const child = snapshot.children.find((item) => item.id === profileId);
        if (!child) throw new Error("Profile balance is not loaded");
        await mutate(() =>
          rpc("set_exact_available_xp", {
            p_profile_id: profileId,
            p_target_available_xp: amount,
            p_expected_balance_version: child.balanceVersion,
            p_reason: reason,
            p_idempotency_key: idempotencyKey,
          }),
        );
      } else
        await mutate(() =>
          rpc("adjust_xp", {
            p_profile_id: profileId,
            p_lifetime_delta: mode === "add" ? amount : 0,
            p_available_delta: mode === "add" ? amount : -amount,
            p_reason: reason,
            p_idempotency_key: idempotencyKey,
          }),
        );
    },
    async awardExitTicket(profileId, reason, key) {
      await mutate(() =>
        rpc("award_daily_xp", {
          p_profile_id: profileId,
          p_award_kind: "exit_ticket",
          p_idempotency_key: key,
          p_reason: reason,
        }),
      );
    },
    async setRewardGoal(rewardId, version) {
      void version;
      await mutate(() =>
        rpc("set_reward_goal", {
          p_profile_id: snapshot.activeChild?.id,
          p_reward_id: rewardId,
          p_expected_goal_version: snapshot.activeChild?.activeRewardVersion ?? 0,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async requestRedemption(rewardId, version) {
      await mutate(() =>
        rpc("request_redemption", {
          p_redemption_id: uuid(),
          p_reward_id: rewardId,
          p_expected_reward_version: version,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async resolveRedemption(id, decision, reason) {
      const redemption = snapshot.children.flatMap((c) => c.redemptions).find((r) => r.id === id);
      await mutate(() =>
        rpc("resolve_redemption", {
          p_redemption_id: id,
          p_decision: decision,
          p_expected_version: redemption?.version ?? 0,
          p_note: reason,
          p_idempotency_key: uuid(),
        }),
      );
    },
    async getMigrationComparisons() {
      const { data, error } = await supabase.from("migration_sessions").select("*");
      if (error) throw error;
      migrationRows.clear();
      const views: MigrationComparisonView[] = [];
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        migrationRows.set(String(row["id"]), row);
        const profile = snapshot.children.find((c) => c.id === row["profile_id"]);
        if (!profile?.localProfileId) continue;
        const report = value<Record<string, unknown>>(row, "comparison_report", {}),
          local = value<Record<string, unknown>>(report, "local", {}),
          cloud = value<Record<string, unknown>>(report, "cloud", {});
        const cloudLedger = Number(cloud["ledgerCount"] ?? 0),
          cloudRewards = Number(cloud["rewardCount"] ?? 0),
          cloudRedemptions = Number(cloud["redemptionCount"] ?? 0),
          conflicts = [cloudLedger, cloudRewards, cloudRedemptions].filter((x) => x > 0).length;
        const exported =
          localStorage.getItem(`ssatquest.phase1.backup-exported.${row["id"]}`) === "true";
        views.push({
          sessionId: String(row["id"]),
          profileId: String(row["profile_id"]),
          localProfileId: profile.localProfileId,
          profileName: profile.displayName,
          sourceHash: String(row["source_profile_sha256"]),
          backupState: exported
            ? "encrypted_export_ready"
            : row["encrypted_backup_path"]
              ? "uploaded_encrypted"
              : "local_only",
          migrationState: row["status"] === "confirmed" ? "confirmed_cloud" : "staged",
          rows: [
            {
              domain: "xp",
              localSummary: `${local["lifetimeXp"] ?? 0} lifetime / ${local["availableXp"] ?? 0} available`,
              cloudSummary: `${cloud["lifetimeXp"] ?? 0} lifetime / ${cloud["availableXp"] ?? 0} available; ${cloudLedger} ledger events`,
              resolution: "Cloud must be empty; opening balance is inserted once.",
              state: cloudLedger > 0 ? "conflict" : "match",
            },
            {
              domain: "rewards",
              localSummary: `${local["rewardCount"] ?? 0} rewards`,
              cloudSummary: `${cloudRewards} rewards`,
              resolution: "Legacy rewards import only into an empty cloud profile.",
              state: cloudRewards > 0 ? "conflict" : "match",
            },
            {
              domain: "redemptions",
              localSummary: `${local["redemptionCount"] ?? 0} redemptions`,
              cloudSummary: `${cloudRedemptions} redemptions`,
              resolution: "History imports only into an empty cloud profile.",
              state: cloudRedemptions > 0 ? "conflict" : "match",
            },
            {
              domain: "analogy",
              localSummary: "Preserved in encrypted/local backup",
              cloudSummary: "Phase 1 local-only",
              resolution: "Never imported in Phase 1",
              state: "preserved_local",
            },
            {
              domain: "vocabulary",
              localSummary: "Preserved in encrypted/local backup",
              cloudSummary: "Phase 1 local-only",
              resolution: "Never imported in Phase 1",
              state: "preserved_local",
            },
          ],
          localLifetimeXp: Number(local["lifetimeXp"] ?? 0),
          localAvailableXp: Number(local["availableXp"] ?? 0),
          cloudLifetimeXp: Number(cloud["lifetimeXp"] ?? 0),
          cloudAvailableXp: Number(cloud["availableXp"] ?? 0),
          unresolvedConflicts: conflicts,
          confirmationPhrase: `CONFIRM ${profile.displayName}`,
        });
      }
      return views;
    },
    async prepareMigration(localProfileId) {
      if (localProfileId !== "test" && !realMigrationEnabled)
        throw new Error("Real-profile migration is disabled in this staging build");
      const profile = snapshot.children.find((child) => child.localProfileId === localProfileId);
      if (!profile) throw new Error("Cloud profile mapping not found");
      const migrationId = uuid(),
        idempotencyKey = uuid(),
        sourceInstallationId = `browser-${crypto.randomUUID()}`,
        archive = await createRawMigrationArchive(sourceInstallationId),
        candidate = buildMigrationCandidate(archive.raw, localProfileId),
        hashes = await migrationHashes(archive.raw, localProfileId);
      const form = new FormData();
      form.set("backup", archive.encrypted.blob, "backup.aesgcm");
      form.set("profileId", profile.id);
      form.set("migrationId", migrationId);
      const uploaded = await invoke("migration-backup-upload", form);
      migrationRecoveryKeys.set(migrationId, archive.encrypted.recoveryKey);
      migrationBlobs.set(migrationId, archive.encrypted.blob);
      await rpc("stage_migration_snapshot", {
        p_migration_id: migrationId,
        p_profile_id: profile.id,
        p_source_installation_id: sourceInstallationId,
        p_idempotency_key: idempotencyKey,
        p_source_shared_sha256: hashes.sharedSha256,
        p_source_profile_sha256: hashes.profileSha256,
        p_normalized_candidate: candidate,
        p_encrypted_backup_path: uploaded["path"],
        p_encrypted_backup_sha256: uploaded["sha256"],
      });
      await refresh();
      await this.exportMigrationBackup(migrationId);
      await refresh();
    },
    async exportMigrationBackup(sessionId) {
      const recoveryKey = migrationRecoveryKeys.get(sessionId);
      if (!recoveryKey)
        throw new Error(
          "Recovery key is not present in this browser session; prepare a fresh comparison before confirmation",
        );
      let blob = migrationBlobs.get(sessionId);
      if (!blob) {
        const row = migrationRows.get(sessionId);
        if (!row?.["encrypted_backup_path"]) throw new Error("Encrypted backup path not found");
        const { data, error } = await supabase.storage
          .from("migration-backups")
          .download(String(row["encrypted_backup_path"]));
        if (error) throw error;
        blob = data;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `ssatquest-${sessionId}.aesgcm`;
      a.click();
      URL.revokeObjectURL(url);
      const key = new Blob([recoveryKey], { type: "text/plain" }),
        keyUrl = URL.createObjectURL(key),
        k = document.createElement("a");
      k.href = keyUrl;
      k.download = `ssatquest-${sessionId}.recovery-key.txt`;
      k.click();
      URL.revokeObjectURL(keyUrl);
      localStorage.setItem(`ssatquest.phase1.backup-exported.${sessionId}`, "true");
    },
    async confirmMigration(sessionId, phrase) {
      const comparison = (await this.getMigrationComparisons()).find(
          (x) => x.sessionId === sessionId,
        ),
        row = migrationRows.get(sessionId);
      if (!comparison || !row || phrase !== comparison.confirmationPhrase)
        throw new Error("Confirmation phrase does not match");
      if (comparison.backupState !== "encrypted_export_ready")
        throw new Error(
          "Download the encrypted backup and separate recovery key before confirmation",
        );
      if (comparison.unresolvedConflicts > 0)
        throw new Error("Migration comparison has unresolved cloud conflicts");
      if (comparison.localProfileId !== "test" && !realMigrationEnabled)
        throw new Error("Real-profile migration is disabled in this staging build");
      const current = await migrationHashes(
        (await createRawMigrationArchive("confirmation-check")).raw,
        comparison.localProfileId,
      );
      if (
        current.sharedSha256 !== row["source_shared_sha256"] ||
        current.profileSha256 !== row["source_profile_sha256"]
      )
        throw new Error("Local data changed after staging; prepare a fresh comparison and backup");
      await mutate(() =>
        rpc("confirm_migration", {
          p_migration_id: sessionId,
          p_source_shared_sha256: row["source_shared_sha256"],
          p_source_profile_sha256: row["source_profile_sha256"],
          p_confirm_cloud_authoritative: true,
        }),
      );
      markCloudAuthoritative(
        comparison.profileId,
        comparison.localProfileId,
        sessionId,
        new Date().toISOString(),
      );
    },
  };
}

/** Staging-only registration; production stays local-only unless explicitly built true. */
export function registerPhase1SyncRuntime() {
  if (!enabled || typeof window === "undefined") return () => undefined;
  const runtime = createPhase1SyncRuntime(),
    unregister = configurePhase1SyncAdapter(runtime);
  const online = () => void runtime.retrySync(),
    auth = supabase.auth.onAuthStateChange(() => void runtime.retrySync());
  const visible = () => {
    if (document.visibilityState === "visible") void runtime.retrySync();
  };
  const poll = window.setInterval(() => {
    if (navigator.onLine) void runtime.retrySync();
  }, 30_000);
  addEventListener("online", online);
  addEventListener("ssatquest:outbox", online);
  addEventListener("focus", online);
  document.addEventListener("visibilitychange", visible);
  return () => {
    clearInterval(poll);
    removeEventListener("online", online);
    removeEventListener("focus", online);
    removeEventListener("ssatquest:outbox", online);
    document.removeEventListener("visibilitychange", visible);
    auth.data.subscription.unsubscribe();
    unregister();
  };
}
