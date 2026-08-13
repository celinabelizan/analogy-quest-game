-- SSAT Quest secure synchronization, Phase 1: durable data model.
-- REVIEW GATE: this migration is intentionally checked in but must not be applied
-- to any Supabase project until the parent has approved the SQL/RLS review.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.child_profile_kind as enum ('child', 'test');
create type public.local_profile_id as enum ('bianca', 'calista', 'test');
create type public.device_assignment_status as enum ('active', 'revoked', 'replaced');
create type public.xp_ledger_kind as enum ('earned', 'parent_adjustment', 'reward_spend', 'reversal', 'migration_credit');
create type public.evidence_status as enum ('accepted', 'needs_review', 'rejected');
create type public.reward_revision_status as enum ('pending', 'approved', 'declined', 'withdrawn');
create type public.reward_item_status as enum ('pending', 'approved', 'declined', 'redeemed', 'archived');
create type public.redemption_status as enum ('pending', 'approved', 'declined', 'reversed');
create type public.migration_status as enum ('staged', 'confirmed', 'rollback_pending', 'rolled_back');
create type public.migration_capture_status as enum ('requested', 'captured', 'expired', 'cancelled');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  timezone text not null default 'America/Los_Angeles',
  real_profile_migration_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (timezone = 'America/Los_Angeles')
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 80),
  local_profile_id public.local_profile_id not null,
  kind public.child_profile_kind not null default 'child',
  sync_authoritative_at timestamptz,
  sync_authoritative_migration_id uuid,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (family_id, id),
  unique (family_id, local_profile_id)
);
create index child_profiles_family_idx on public.child_profiles(family_id) where archived_at is null;

create table public.parent_memberships (
  family_id uuid not null references public.families(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (family_id, auth_user_id)
);
create unique index one_active_owner_per_family on public.parent_memberships(family_id)
  where is_owner and revoked_at is null;

create table public.device_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  profile_id uuid not null,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status public.device_assignment_status not null default 'active',
  installation_label text check (installation_label is null or char_length(installation_label) <= 100),
  enrolled_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  replaced_by uuid references public.device_assignments(id) on delete set null,
  last_device_sequence bigint not null default 0 check (last_device_sequence >= 0),
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict,
  unique (auth_user_id)
);
create unique index one_active_installation_per_profile
  on public.device_assignments(profile_id) where status = 'active';
create index device_assignments_profile_idx on public.device_assignments(profile_id, status);

create table public.profile_balances (
  profile_id uuid primary key references public.child_profiles(id) on delete restrict,
  lifetime_xp bigint not null default 0 check (lifetime_xp >= 0),
  available_xp bigint not null default 0 check (available_xp >= 0),
  version bigint not null default 0 check (version >= 0),
  updated_at timestamptz not null default now()
);

create table public.xp_evidence_events (
  event_id uuid primary key,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  assignment_id uuid references public.device_assignments(id) on delete restrict,
  attempt_id uuid,
  device_sequence bigint,
  evidence_kind text not null check (char_length(evidence_kind) between 1 and 64),
  content_id text check (content_id is null or char_length(content_id) <= 100),
  content_version integer not null default 1 check (content_version > 0),
  rule_version integer not null default 1 check (rule_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 8192),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  family_local_date date not null,
  status public.evidence_status not null,
  awarded_xp integer not null default 0 check (awarded_xp >= 0),
  review_reason text check (review_reason is null or char_length(review_reason) <= 1000),
  unique (assignment_id, device_sequence)
);
create index evidence_profile_received_idx on public.xp_evidence_events(profile_id, received_at desc);
create index evidence_attempt_idx on public.xp_evidence_events(profile_id, attempt_id, evidence_kind);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  kind public.xp_ledger_kind not null,
  lifetime_delta bigint not null,
  available_delta bigint not null,
  source_event_id uuid references public.xp_evidence_events(event_id) on delete restrict,
  source_redemption_id uuid,
  reverses_ledger_id uuid references public.xp_ledger(id) on delete restrict,
  idempotency_key uuid not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  reason text check (reason is null or char_length(reason) <= 1000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (profile_id, idempotency_key),
  unique (source_event_id),
  unique (reverses_ledger_id),
  check ((kind = 'earned' and (source_event_id is not null or metadata ? 'awardKind')
      and lifetime_delta >= 0 and available_delta = lifetime_delta)
    or kind <> 'earned'),
  check ((kind = 'reversal' and reverses_ledger_id is not null) or (kind <> 'reversal' and reverses_ledger_id is null))
);
create index xp_ledger_profile_created_idx on public.xp_ledger(profile_id, created_at, id);

create table public.daily_award_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  family_local_date date not null,
  award_kind text not null check (award_kind in ('exit_ticket', 'analogy_day_bonus', 'vocab_day_bonus')),
  calendar_scheme text not null default 'la-v1' check (calendar_scheme in ('la-v1', 'utc-v1')),
  ledger_id uuid references public.xp_ledger(id) on delete restrict,
  preserved_zero_delta boolean not null default false,
  migration_id uuid,
  created_at timestamptz not null default now(),
  unique (profile_id, family_local_date, award_kind)
);

create table public.offline_attempt_authorizations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.device_assignments(id) on delete restrict,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_attempt_id uuid,
  consumed_content_id text,
  consumed_at timestamptz,
  check (expires_at > issued_at),
  unique (assignment_id, consumed_attempt_id)
);
create index offline_authorizations_assignment_idx
  on public.offline_attempt_authorizations(assignment_id, expires_at) where consumed_at is null;

create table public.family_reward_settings (
  family_id uuid primary key references public.families(id) on delete restrict,
  show_rewards boolean not null default false,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.reward_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  profile_id uuid not null,
  status public.reward_item_status not null default 'pending',
  approved_revision_id uuid,
  authoritative_xp_cost integer check (authoritative_xp_cost is null or authoritative_xp_cost > 0),
  is_reusable boolean not null default false,
  version bigint not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  redeemed_at timestamptz,
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict
);
create index reward_items_profile_idx on public.reward_items(profile_id, status, created_at desc);

create table public.reward_revisions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.reward_items(id) on delete restrict,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  status public.reward_revision_status not null default 'pending',
  name text not null check (char_length(btrim(name)) between 1 and 160),
  product_url text,
  estimated_price_cents integer check (estimated_price_cents is null or estimated_price_cents between 0 and 10000000),
  image_asset_id uuid,
  proposed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (reward_id, revision_number)
);
alter table public.reward_items add constraint reward_items_approved_revision_fk
  foreign key (approved_revision_id) references public.reward_revisions(id) on delete restrict;

create table public.reward_image_assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  profile_id uuid not null,
  reward_id uuid not null references public.reward_items(id) on delete restrict,
  revision_id uuid references public.reward_revisions(id) on delete restrict,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict
);
alter table public.reward_revisions add constraint reward_revisions_image_fk
  foreign key (image_asset_id) references public.reward_image_assets(id) on delete restrict;

create table public.reward_goals (
  profile_id uuid primary key references public.child_profiles(id) on delete restrict,
  reward_id uuid references public.reward_items(id) on delete restrict,
  version bigint not null default 0,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  profile_id uuid not null,
  reward_id uuid not null references public.reward_items(id) on delete restrict,
  reward_revision_id uuid not null references public.reward_revisions(id) on delete restrict,
  reward_name_snapshot text not null,
  xp_cost_snapshot integer not null check (xp_cost_snapshot > 0),
  status public.redemption_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  spend_ledger_id uuid references public.xp_ledger(id) on delete restrict,
  reversal_ledger_id uuid references public.xp_ledger(id) on delete restrict,
  version bigint not null default 0,
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict
);
create unique index one_pending_redemption_per_profile
  on public.redemption_requests(profile_id) where status = 'pending';
alter table public.xp_ledger add constraint xp_ledger_redemption_fk
  foreign key (source_redemption_id) references public.redemption_requests(id) on delete restrict;

create table public.migration_sessions (
  id uuid primary key,
  family_id uuid not null,
  profile_id uuid not null,
  source_installation_id text not null check (char_length(source_installation_id) between 1 and 200),
  idempotency_key uuid not null,
  source_shared_sha256 text not null check (source_shared_sha256 ~ '^[0-9a-f]{64}$'),
  source_profile_sha256 text not null check (source_profile_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_candidate jsonb not null check (jsonb_typeof(normalized_candidate) = 'object'),
  encrypted_backup_path text,
  encrypted_backup_sha256 text check (encrypted_backup_sha256 is null or encrypted_backup_sha256 ~ '^[0-9a-f]{64}$'),
  status public.migration_status not null default 'staged',
  comparison_report jsonb not null default '{}'::jsonb,
  staged_by uuid not null references auth.users(id) on delete restrict,
  staged_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  rolled_back_by uuid references auth.users(id) on delete restrict,
  rolled_back_at timestamptz,
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict,
  unique (profile_id, idempotency_key)
);

create table public.migration_capture_requests (
  id uuid primary key,
  family_id uuid not null,
  profile_id uuid not null,
  assignment_id uuid not null references public.device_assignments(id) on delete restrict,
  status public.migration_capture_status not null default 'requested',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  captured_at timestamptz,
  backup_exported_at timestamptz,
  foreign key (family_id, profile_id) references public.child_profiles(family_id, id) on delete restrict,
  check (expires_at > requested_at),
  check (captured_at is null or captured_at >= requested_at),
  check (backup_exported_at is null or captured_at is not null)
);
create unique index one_open_migration_capture_per_profile
  on public.migration_capture_requests(profile_id) where status in ('requested','captured');

create table public.audit_events (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id) on delete restrict,
  profile_id uuid references public.child_profiles(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('parent', 'child_device', 'system')),
  action text not null check (char_length(action) between 1 and 100),
  target_table text not null,
  target_id text not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index audit_family_created_idx on public.audit_events(family_id, created_at desc, id desc);

create table private.enrollment_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  installation_label text check (installation_label is null or char_length(installation_label) <= 100),
  secret_hash text not null unique check (secret_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete restrict,
  replacement_for_assignment_id uuid references public.device_assignments(id) on delete restrict,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  check (expires_at > created_at)
);
create unique index one_live_invitation_per_profile on private.enrollment_invitations(profile_id)
  where consumed_at is null;

create table private.idempotency_receipts (
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null,
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_user_id, operation, idempotency_key)
);

create table private.rate_limit_buckets (
  actor_key text not null,
  operation text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 0,
  primary key (actor_key, operation, window_started_at)
);

create table private.content_catalog (
  content_id text not null,
  content_version integer not null default 1,
  content_kind text not null check (content_kind in ('analogy', 'vocab')),
  difficulty smallint check (difficulty between 1 and 3),
  correct_choice text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  primary key (content_id, content_version)
);

create table private.xp_attempt_state (
  assignment_id uuid not null references public.device_assignments(id) on delete restrict,
  attempt_id uuid not null,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  content_id text not null,
  mode text not null check (mode in ('full', 'repeat', 'none')),
  type_awarded boolean not null default false,
  bridge_awarded boolean not null default false,
  discarded_choices text[] not null default '{}',
  final_awarded boolean not null default false,
  completed boolean not null default false,
  correct boolean,
  created_at timestamptz not null default now(),
  primary key (assignment_id, attempt_id)
);

create table private.profile_xp_facts (
  profile_id uuid primary key references public.child_profiles(id) on delete restrict,
  completed_analogy_count bigint not null default 0,
  correct_analogy_count bigint not null default 0,
  correct_streak integer not null default 0,
  vocab_answer_count bigint not null default 0
);

create table private.daily_progress_facts (
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  family_local_date date not null,
  analogy_completed integer not null default 0 check (analogy_completed >= 0),
  vocab_done integer not null default 0 check (vocab_done >= 0),
  migration_id uuid references public.migration_sessions(id) on delete restrict,
  primary key (profile_id, family_local_date)
);

create table private.analogy_completion_facts (
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  content_id text not null,
  completed_ordinal bigint not null,
  primary key (profile_id, content_id, completed_ordinal)
);

create table private.vocab_xp_facts (
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  vocab_id text not null,
  correct_context_count integer not null default 0,
  mastery_bonus_awarded boolean not null default false,
  primary key (profile_id, vocab_id)
);

create table private.raw_migration_backups (
  migration_id uuid primary key,
  family_id uuid not null references public.families(id) on delete restrict,
  profile_id uuid not null references public.child_profiles(id) on delete restrict,
  storage_path text not null unique,
  ciphertext_sha256 text not null check (ciphertext_sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_at timestamptz not null default now(),
  verified_by_server boolean not null default false,
  retain_until timestamptz not null default now() + interval '30 days',
  check (retain_until >= uploaded_at + interval '30 days')
);

-- Default-deny privileges. Mutations are exposed only through reviewed functions.
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- Read privileges are still constrained by RLS in the next migration.
grant select on public.families, public.child_profiles, public.parent_memberships,
  public.device_assignments, public.profile_balances, public.xp_evidence_events,
  public.xp_ledger, public.daily_award_claims, public.family_reward_settings,
  public.reward_items, public.reward_revisions, public.reward_goals,
  public.redemption_requests, public.reward_image_assets, public.migration_sessions,
  public.migration_capture_requests,
  public.audit_events to authenticated;

comment on schema private is 'Not exposed by PostgREST. Enrollment secrets, rate limits, and XP validation facts.';
comment on table public.xp_ledger is 'Immutable XP ledger. Balances are projections updated only by SECURITY DEFINER functions.';
comment on table public.xp_evidence_events is 'Minimum Phase-1 XP evidence only; full learning state remains local-authoritative.';
