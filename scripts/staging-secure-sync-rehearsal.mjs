import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required staging variable: ${name}`);
  return value;
};

const projectId = required("SUPABASE_PROJECT_ID");
const supabaseUrl = required("SUPABASE_URL");
const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
const accessToken = required("SUPABASE_ACCESS_TOKEN");
const enrollmentIpHashSecret = required("ENROLLMENT_IP_HASH_SECRET");
const previewUrl = process.env.STAGING_PREVIEW_URL ?? "http://127.0.0.1:4173";

if (process.env.VITE_SECURE_SYNC_PHASE1 !== "false") {
  throw new Error("Refusing rehearsal unless VITE_SECURE_SYNC_PHASE1=false");
}
if (process.env.VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION !== "false") {
  throw new Error("Refusing rehearsal unless VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false");
}
if (!supabaseUrl.includes(projectId)) {
  throw new Error("SUPABASE_URL and SUPABASE_PROJECT_ID do not identify the same staging project");
}

const management = async (path, init = {}) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Staging management request failed (${response.status})`);
  return response.json();
};

const keys = await management("/api-keys?reveal=true");
const serviceRole = keys.find(
  (key) => key.name === "service_role" && key.type === "legacy",
)?.api_key;
if (!serviceRole)
  throw new Error("Staging service-role key is unavailable to the rehearsal runner");

const authConfig = await management("/config/auth");
if (authConfig.site_url !== previewUrl) {
  throw new Error(`Staging Auth site URL must be ${previewUrl} before rehearsal`);
}
if (
  !String(authConfig.uri_allow_list ?? "")
    .split(",")
    .some((uri) => uri.startsWith(previewUrl))
) {
  throw new Error("Staging Auth redirect allow-list does not include the preview URL");
}
if (authConfig.external_anonymous_users_enabled !== true) {
  throw new Error("Staging anonymous Auth must be enabled for synthetic child enrollment");
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(supabaseUrl, serviceRole, clientOptions);
const parent = createClient(supabaseUrl, publishableKey, clientOptions);
const child = createClient(supabaseUrl, publishableKey, clientOptions);
const runLabel = `secure-sync-e2e-${new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const parentEmail = `${runLabel}@example.invalid`;
const parentPassword = randomBytes(32).toString("base64url");
const checks = [];

const assert = (condition, label) => {
  if (!condition) throw new Error(`Rehearsal assertion failed: ${label}`);
  checks.push(label);
};

const unwrap = async (operation, label) => {
  const { data, error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const databaseQuery = (query) =>
  management("/database/query", { method: "POST", body: JSON.stringify({ query }) });

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

const base32Bytes = (value) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
};

const totp = (secret, offset = 0) => {
  const counter = Math.floor(Date.now() / 30_000) + offset;
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Bytes(secret)).update(message).digest();
  const position = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[position] & 0x7f) << 24) |
    ((digest[position + 1] & 0xff) << 16) |
    ((digest[position + 2] & 0xff) << 8) |
    (digest[position + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const invoke = async (client, functionName, body) => {
  const { data, error } = await client.functions.invoke(functionName, { body });
  if (error) throw new Error(`${functionName}: ${error.message}`);
  return data;
};

const rpc = async (client, functionName, args) => {
  const { data, error } = await client.rpc(functionName, args);
  if (error) throw new Error(`${functionName}: ${error.message}`);
  return data;
};

const submitEvidence = async ({ sequence, attemptId, kind, payload, authorization, occurredAt }) =>
  rpc(child, "submit_xp_evidence", {
    p_event_id: randomUUID(),
    p_attempt_id: attemptId,
    p_device_sequence: sequence,
    p_evidence_kind: kind,
    p_content_id: "P1",
    p_content_version: 1,
    p_rule_version: 1,
    p_payload: payload,
    p_payload_hash: sha256(JSON.stringify(payload)),
    p_occurred_at: occurredAt,
    p_offline_authorization: authorization,
  });

try {
  const createdParent = await unwrap(
    admin.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: { synthetic: true, rehearsal: runLabel },
    }),
    "Create synthetic parent",
  );
  const parentUserId = createdParent.user.id;

  const magicLink = await unwrap(
    admin.auth.admin.generateLink({
      type: "magiclink",
      email: parentEmail,
      options: { redirectTo: previewUrl },
    }),
    "Generate synthetic parent magic link",
  );
  const magicLinkResponse = await fetch(magicLink.properties.action_link, { redirect: "follow" });
  assert(
    magicLinkResponse.ok && magicLinkResponse.url.startsWith(previewUrl),
    "parent magic-link redirect reached staging preview",
  );

  await unwrap(
    parent.auth.signInWithPassword({ email: parentEmail, password: parentPassword }),
    "Synthetic parent sign-in",
  );
  assert(
    (await unwrap(parent.auth.getUser(), "Read signed-in parent")).user.id === parentUserId,
    "synthetic parent sign-in established the expected identity",
  );

  const enrolledFactor = await unwrap(
    parent.auth.mfa.enroll({ factorType: "totp", friendlyName: `${runLabel}-primary` }),
    "Enroll staging parent TOTP",
  );
  const challenge = await unwrap(
    parent.auth.mfa.challenge({ factorId: enrolledFactor.id }),
    "Challenge staging parent TOTP",
  );
  await unwrap(
    parent.auth.mfa.verify({
      factorId: enrolledFactor.id,
      challengeId: challenge.id,
      code: totp(enrolledFactor.totp.secret),
    }),
    "Verify staging parent TOTP",
  );
  const recoveryFactor = await unwrap(
    parent.auth.mfa.enroll({ factorType: "totp", friendlyName: `${runLabel}-recovery` }),
    "Enroll staging parent recovery TOTP",
  );
  const recoveryChallenge = await unwrap(
    parent.auth.mfa.challenge({ factorId: recoveryFactor.id }),
    "Challenge staging parent recovery TOTP",
  );
  await unwrap(
    parent.auth.mfa.verify({
      factorId: recoveryFactor.id,
      challengeId: recoveryChallenge.id,
      code: totp(recoveryFactor.totp.secret),
    }),
    "Verify staging parent recovery TOTP",
  );
  const factors = await unwrap(parent.auth.mfa.listFactors(), "List staging parent TOTP factors");
  const verifiedFactorIds = new Set(
    factors.totp.filter((factor) => factor.status === "verified").map((factor) => factor.id),
  );
  assert(
    verifiedFactorIds.has(enrolledFactor.id) &&
      verifiedFactorIds.has(recoveryFactor.id) &&
      enrolledFactor.id !== recoveryFactor.id,
    "synthetic parent recovery readiness used two separately verified TOTP factors",
  );
  const assurance = await unwrap(
    parent.auth.mfa.getAuthenticatorAssuranceLevel(),
    "Read staging parent assurance",
  );
  assert(assurance.currentLevel === "aal2", "synthetic parent reached AAL2 for high-risk actions");

  const primaryFamily = {
    id: randomUUID(),
    name: `${runLabel}-primary`,
    real_profile_migration_enabled: false,
  };
  const isolationFamily = {
    id: randomUUID(),
    name: `${runLabel}-isolation`,
    real_profile_migration_enabled: false,
  };
  const primaryProfile = { id: randomUUID(), family_id: primaryFamily.id, kind: "test" };
  const isolationProfile = { id: randomUUID(), family_id: isolationFamily.id, kind: "test" };
  await databaseQuery(`
    begin;
    insert into public.families(id,name,timezone,real_profile_migration_enabled) values
      (${sqlLiteral(primaryFamily.id)}::uuid,${sqlLiteral(primaryFamily.name)},'America/Los_Angeles',false),
      (${sqlLiteral(isolationFamily.id)}::uuid,${sqlLiteral(isolationFamily.name)},'America/Los_Angeles',false);
    insert into public.child_profiles(id,family_id,display_name,local_profile_id,kind) values
      (${sqlLiteral(primaryProfile.id)}::uuid,${sqlLiteral(primaryFamily.id)}::uuid,'Synthetic Test Child','test','test'),
      (${sqlLiteral(isolationProfile.id)}::uuid,${sqlLiteral(isolationFamily.id)}::uuid,'Synthetic Isolation Child','test','test');
    insert into public.parent_memberships(family_id,auth_user_id,is_owner) values
      (${sqlLiteral(primaryFamily.id)}::uuid,${sqlLiteral(parentUserId)}::uuid,true),
      (${sqlLiteral(isolationFamily.id)}::uuid,${sqlLiteral(parentUserId)}::uuid,true);
    commit;
  `);
  assert(
    primaryFamily.real_profile_migration_enabled === false && primaryProfile.kind === "test",
    "synthetic profile used the test-only migration gate",
  );

  const inviteRows = await rpc(parent, "create_enrollment_invitation", {
    p_profile_id: primaryProfile.id,
    p_installation_label: `${runLabel}-ipad`,
  });
  const invite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
  assert(
    /^[0-9a-f]{64}$/.test(invite.invitation_secret),
    "AAL2 parent created a bounded enrollment invitation",
  );

  const anonymous = await unwrap(child.auth.signInAnonymously(), "Create synthetic child identity");
  assert(anonymous.user?.is_anonymous === true, "synthetic child used a fresh anonymous identity");
  const beforeIpBuckets = await databaseQuery(`
    select actor_key,attempts from private.rate_limit_buckets
    where operation='enrollment_gateway'
      and window_started_at=date_bin(
        interval '15 minutes',clock_timestamp(),'2000-01-01 00:00:00+00'::timestamptz
      )
  `);
  const spoofedClientIps = ["203.0.113.123", "198.51.100.77", "192.0.2.12"];
  const forgedCloudflareProbe = await fetch(
    `${supabaseUrl}/functions/v1/consume-enrollment-invite`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${anonymous.session.access_token}`,
        "Content-Type": "application/json",
        "cf-connecting-ip": spoofedClientIps[0],
      },
      body: JSON.stringify({ code: "0".repeat(64), installationLabel: `${runLabel}-cf-probe` }),
    },
  );
  assert(
    forgedCloudflareProbe.status === 403,
    `edge gateway rejected a caller-supplied Cloudflare IP header (status ${forgedCloudflareProbe.status})`,
  );
  const spoofProbe = await fetch(`${supabaseUrl}/functions/v1/consume-enrollment-invite`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${anonymous.session.access_token}`,
      "Content-Type": "application/json",
      "x-real-ip": spoofedClientIps[1],
      "x-forwarded-for": `192.0.2.11, ${spoofedClientIps[2]}`,
    },
    body: JSON.stringify({ code: "0".repeat(64), installationLabel: `${runLabel}-probe` }),
  });
  const spoofProbeBody = await spoofProbe.json().catch(() => null);
  const genericRejection =
    spoofProbe.status === 400 &&
    spoofProbeBody?.error === "Invalid, expired, or unavailable invitation";
  assert(
    genericRejection,
    `invalid enrollment probe returned the generic rejection (status ${spoofProbe.status}, keys ${JSON.stringify(Object.keys(spoofProbeBody ?? {}))})`,
  );
  const afterIpBuckets = await databaseQuery(`
    select actor_key,attempts from private.rate_limit_buckets
    where operation='enrollment_gateway'
      and window_started_at=date_bin(
        interval '15 minutes',clock_timestamp(),'2000-01-01 00:00:00+00'::timestamptz
      )
  `);
  const priorAttempts = new Map(
    beforeIpBuckets.map((bucket) => [bucket.actor_key, Number(bucket.attempts)]),
  );
  const changedIpBuckets = afterIpBuckets.filter(
    (bucket) =>
      bucket.actor_key.startsWith("ip:") &&
      Number(bucket.attempts) > (priorAttempts.get(bucket.actor_key) ?? 0),
  );
  const spoofedActorKeys = new Set(
    spoofedClientIps.map((ip) => `ip:${sha256(`${enrollmentIpHashSecret}\0${ip}`)}`),
  );
  assert(changedIpBuckets.length >= 1, "enrollment gateway recorded the invalid probe by IP");
  assert(
    changedIpBuckets.every((bucket) => !spoofedActorKeys.has(bucket.actor_key)),
    "enrollment gateway overwrote caller-supplied client-IP headers",
  );
  const enrollment = await invoke(child, "consume-enrollment-invite", {
    code: invite.invitation_secret,
    installationLabel: `${runLabel}-ipad`,
  });
  const assignment = enrollment.assignment;
  assert(
    assignment.profile_id === primaryProfile.id && assignment.status === "active",
    "child device enrollment bound only the assigned test profile",
  );

  const isolationAttempt = await child.rpc("get_phase1_projection", {
    p_profile_id: isolationProfile.id,
  });
  assert(
    Boolean(isolationAttempt.error),
    "child projection access to an unassigned profile was denied",
  );

  const migrationId = randomUUID();
  await rpc(parent, "request_device_migration_capture", {
    p_profile_id: primaryProfile.id,
    p_request_id: migrationId,
  });
  const rawBackup = JSON.stringify({
    schemaVersion: 8,
    synthetic: true,
    runLabel,
    shared: { settings: { showRewards: true } },
    profile: { localProfileId: "test", lifetimeXp: 40, availableXp: 40 },
  });
  const encryptionKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = (await import("node:crypto")).createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(rawBackup), cipher.final(), cipher.getAuthTag()]);
  const envelope = Buffer.from(
    JSON.stringify({
      version: 1,
      algorithm: "AES-256-GCM",
      iv: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    }),
  );
  const backupForm = new FormData();
  backupForm.set(
    "backup",
    new Blob([envelope], { type: "application/octet-stream" }),
    "backup.aesgcm",
  );
  backupForm.set("profileId", primaryProfile.id);
  backupForm.set("migrationId", migrationId);
  const uploaded = await invoke(child, "migration-backup-upload", backupForm);
  assert(
    uploaded.sha256 === sha256(envelope),
    "encrypted migration backup was uploaded and server-attested",
  );

  const sharedHash = sha256(JSON.stringify({ synthetic: true, shared: true, runLabel }));
  const profileHash = sha256(JSON.stringify({ synthetic: true, profile: "test", runLabel }));
  const candidate = {
    lifetimeXp: 40,
    availableXp: 40,
    rewards: [],
    redemptions: [],
    vocabBonusFacts: [],
    dailyProgressFacts: [],
    overlappingDailyClaims: [],
    xpFacts: {
      completedAnalogyCount: 0,
      correctAnalogyCount: 0,
      correctStreak: 0,
      vocabAnswerCount: 0,
      analogyLastCompleted: [],
    },
    localLearningSummary: { analogy: "preserved-local", vocabulary: "preserved-local" },
    showRewards: true,
    activeRewardId: null,
  };
  const comparison = await rpc(child, "stage_migration_snapshot", {
    p_migration_id: migrationId,
    p_profile_id: primaryProfile.id,
    p_source_installation_id: assignment.id,
    p_idempotency_key: randomUUID(),
    p_source_shared_sha256: sharedHash,
    p_source_profile_sha256: profileHash,
    p_normalized_candidate: candidate,
    p_encrypted_backup_path: uploaded.path,
    p_encrypted_backup_sha256: uploaded.sha256,
  });
  assert(
    comparison.requiresExplicitConfirmation === true && comparison.cloud.ledgerCount === 0,
    "migration capture produced an explicit empty-cloud comparison",
  );
  await rpc(child, "acknowledge_migration_backup_export", { p_migration_id: migrationId });
  const confirmation = await rpc(parent, "confirm_migration", {
    p_migration_id: migrationId,
    p_source_shared_sha256: sharedHash,
    p_source_profile_sha256: profileHash,
    p_confirm_cloud_authoritative: true,
  });
  assert(
    confirmation.confirmed === true && confirmation.ledgerLifetimeXp === 40,
    "AAL2 parent confirmed only the reviewed test-profile migration",
  );

  const authorizations = await rpc(child, "issue_offline_attempt_authorizations", {
    p_count: 1,
  });
  const authorization = Array.isArray(authorizations)
    ? authorizations[0].token_secret
    : authorizations.token_secret;
  checks.push("child issued a bounded offline attempt authorization");
  const attemptId = randomUUID();
  const occurredAt = new Date().toISOString();
  const xpResults = [];
  xpResults.push(
    await submitEvidence({
      sequence: 1,
      attemptId,
      kind: "analogy_type_correct",
      payload: { group: "used" },
      authorization,
      occurredAt,
    }),
  );
  xpResults.push(
    await submitEvidence({
      sequence: 2,
      attemptId,
      kind: "analogy_bridge_lock",
      payload: {},
      authorization,
      occurredAt,
    }),
  );
  xpResults.push(
    await submitEvidence({
      sequence: 3,
      attemptId,
      kind: "analogy_final",
      payload: { choice: "B", blank: false },
      authorization,
      occurredAt,
    }),
  );
  xpResults.push(
    await submitEvidence({
      sequence: 4,
      attemptId,
      kind: "analogy_complete",
      payload: {},
      authorization,
      occurredAt,
    }),
  );
  assert(
    xpResults.every((result) => result.status === "accepted") &&
      xpResults.at(-1).balance.lifetime_xp === 48,
    "offline-authorized XP evidence reconciled in sequence to the expected 48 XP balance",
  );

  const rewardId = randomUUID();
  const revisionId = randomUUID();
  const rewardArgs = {
    p_reward_id: rewardId,
    p_revision_id: revisionId,
    p_profile_id: primaryProfile.id,
    p_name: "Synthetic staging reward",
    p_product_url: null,
    p_estimated_price_cents: 500,
    p_image_asset_id: null,
    p_idempotency_key: randomUUID(),
  };
  const proposed = await rpc(child, "submit_reward_proposal", rewardArgs);
  const replayed = await rpc(child, "submit_reward_proposal", rewardArgs);
  assert(
    proposed.rewardId === replayed.rewardId && proposed.status === "pending",
    "offline-style reward retry replayed idempotently without duplication",
  );
  const reviewed = await rpc(parent, "review_reward_revision", {
    p_revision_id: revisionId,
    p_decision: "approve",
    p_final_name: "Synthetic staging reward",
    p_final_product_url: null,
    p_final_estimated_price_cents: 500,
    p_authoritative_xp_cost: 5,
    p_is_reusable: false,
    p_review_note: "Synthetic staging rehearsal approval",
    p_expected_reward_version: 0,
    p_idempotency_key: randomUUID(),
  });
  assert(
    reviewed.decision === "approve" && reviewed.version === 1,
    "AAL2 parent approved the synchronized synthetic reward",
  );

  const beforeRollback = await rpc(child, "get_phase1_projection", { p_profile_id: null });
  assert(
    beforeRollback.balance.lifetime_xp === 48 && beforeRollback.rewards.length === 1,
    "child projection isolated the synchronized XP and approved reward",
  );
  const rollbackRequested = await rpc(parent, "rollback_migration", {
    p_migration_id: migrationId,
    p_reason: "Synthetic staging end-to-end rollback",
  });
  assert(
    rollbackRequested.status === "rollback_pending",
    "AAL2 parent requested two-party rollback",
  );
  const materialized = {
    lifetimeXp: beforeRollback.balance.lifetime_xp,
    availableXp: beforeRollback.balance.available_xp,
    rewardCount: beforeRollback.rewards.length,
    redemptionCount: beforeRollback.redemptions.length,
    showRewards: beforeRollback.rewardVisibility,
  };
  const completedRollback = await rpc(child, "complete_migration_rollback", {
    p_migration_id: migrationId,
    p_materialized_sha256: sha256(JSON.stringify(materialized)),
  });
  assert(
    completedRollback.status === "rolled_back",
    "assigned child completed rollback materialization acknowledgement",
  );
  const afterRollback = await rpc(child, "get_phase1_projection", { p_profile_id: null });
  assert(
    afterRollback.syncAuthoritativeAt === null && afterRollback.migrationStatus === "rolled_back",
    "rollback returned the synthetic child profile to local authority",
  );

  console.log(
    JSON.stringify(
      {
        runLabel,
        stagingProject: projectId,
        flags: { secureSyncPhase1: false, realProfileMigration: false },
        authRedirect: previewUrl,
        checks,
        finalState: {
          migrationStatus: afterRollback.migrationStatus,
          syncAuthoritative: false,
          retainedLifetimeXp: afterRollback.balance.lifetime_xp,
          retainedRewardCount: afterRollback.rewards.length,
        },
        syntheticRecordsRetained: true,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify({ runLabel, error: error instanceof Error ? error.message : String(error) }),
  );
  process.exitCode = 1;
}
