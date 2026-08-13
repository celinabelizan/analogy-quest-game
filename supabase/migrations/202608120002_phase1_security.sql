-- SSAT Quest secure synchronization, Phase 1: RLS, immutable boundaries, helpers.

create or replace function private.is_parent_of_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select exists (
    select 1 from public.parent_memberships pm
    where pm.family_id = p_family_id
      and pm.auth_user_id = auth.uid()
      and pm.revoked_at is null
  );
$$;

create or replace function private.is_active_child_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select exists (
    select 1 from public.device_assignments da
    where da.profile_id = p_profile_id
      and da.auth_user_id = auth.uid()
      and da.status = 'active'
  );
$$;

create or replace function private.is_parent_of_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select exists (
    select 1
    from public.child_profiles cp
    join public.parent_memberships pm on pm.family_id = cp.family_id
    where cp.id = p_profile_id
      and pm.auth_user_id = auth.uid()
      and pm.revoked_at is null
  );
$$;

create or replace function private.require_authenticated_uid()
returns uuid
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  return v_uid;
end;
$$;

create or replace function private.require_parent(p_family_id uuid, p_require_aal2 boolean default false)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_uid uuid := auth.uid();
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not private.is_parent_of_family(p_family_id) then
    raise exception 'parent membership required' using errcode = '42501';
  end if;
  if p_require_aal2 and v_aal <> 'aal2' then
    raise exception 'aal2 required' using errcode = '42501', hint = 'Verify a TOTP factor and retry.';
  end if;
  return v_uid;
end;
$$;

create or replace function private.require_active_assignment()
returns public.device_assignments
language plpgsql
stable
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment public.device_assignments;
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into v_assignment from public.device_assignments
  where auth_user_id = v_uid and status = 'active';
  if not found then raise exception 'active child installation required' using errcode = '42501'; end if;
  return v_assignment;
end;
$$;

create or replace function private.require_profile_cloud_authoritative(p_profile_id uuid)
returns void language plpgsql stable security definer
set search_path=pg_catalog,public
as $$ begin
 if not exists(select 1 from public.child_profiles where id=p_profile_id and sync_authoritative_at is not null) then
  raise exception 'profile migration is not confirmed' using errcode='42501';
 end if;
end $$;

create or replace function private.rate_limit(
  p_actor_key text,
  p_operation text,
  p_limit integer,
  p_window interval
) returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, private
as $$
declare
  v_window timestamptz := date_bin(p_window, clock_timestamp(), '2000-01-01 00:00:00+00'::timestamptz);
  v_attempts integer;
begin
  if p_limit < 1 or p_window <= interval '0 seconds' then raise exception 'invalid rate limit'; end if;
  insert into private.rate_limit_buckets(actor_key, operation, window_started_at, attempts)
  values (p_actor_key, p_operation, v_window, 1)
  on conflict (actor_key, operation, window_started_at)
  do update set attempts = private.rate_limit_buckets.attempts + 1
  returning attempts into v_attempts;
  if v_attempts > p_limit then raise exception 'rate limit exceeded' using errcode = 'P0001'; end if;
end;
$$;

create or replace function private.safe_product_url(p_url text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select p_url is null or (
    char_length(p_url) <= 2048
    and p_url ~* '^https?://[^[:space:]/?#]+(?:[/?#]|$)'
    and p_url !~ '[[:cntrl:]]'
    and p_url !~* '^https?://[^/]*@'
    and p_url !~* '^https?://(localhost|\[?::1\]?|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
  );
$$;

alter table public.reward_revisions add constraint reward_revisions_safe_product_url
  check (private.safe_product_url(product_url));

create or replace function private.block_immutable_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '55000';
end;
$$;

create trigger xp_ledger_immutable before update or delete on public.xp_ledger
  for each row execute function private.block_immutable_change();
create or replace function private.protect_evidence_change()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if tg_op='DELETE' then raise exception 'XP evidence cannot be deleted' using errcode='55000'; end if;
  if new.event_id<>old.event_id or new.profile_id<>old.profile_id
    or new.assignment_id is distinct from old.assignment_id or new.attempt_id is distinct from old.attempt_id
    or new.device_sequence is distinct from old.device_sequence or new.evidence_kind<>old.evidence_kind
    or new.content_id is distinct from old.content_id or new.content_version<>old.content_version
    or new.rule_version<>old.rule_version or new.payload<>old.payload or new.payload_hash<>old.payload_hash
    or new.occurred_at<>old.occurred_at or new.received_at<>old.received_at
    or new.family_local_date<>old.family_local_date or new.awarded_xp<>old.awarded_xp then
    raise exception 'XP evidence facts are immutable' using errcode='55000';
  end if;
  if old.status<>'needs_review' or new.status not in ('accepted','rejected') then
    raise exception 'only pending evidence may be resolved' using errcode='55000';
  end if;
  return new;
end $$;
create trigger xp_evidence_protected before update or delete on public.xp_evidence_events
  for each row execute function private.protect_evidence_change();
create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function private.block_immutable_change();
create trigger daily_award_claims_immutable before update or delete on public.daily_award_claims
  for each row execute function private.block_immutable_change();

create or replace function private.protect_assignment_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.id <> old.id or new.family_id <> old.family_id or new.profile_id <> old.profile_id
     or new.auth_user_id <> old.auth_user_id or new.enrolled_at <> old.enrolled_at then
    raise exception 'device assignment identity is immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger device_assignment_identity_immutable before update on public.device_assignments
  for each row execute function private.protect_assignment_identity();

create or replace function private.protect_profile_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.id <> old.id or new.family_id <> old.family_id or new.kind <> old.kind
     or new.local_profile_id <> old.local_profile_id then
    raise exception 'profile identity is immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger child_profile_identity_immutable before update on public.child_profiles
  for each row execute function private.protect_profile_identity();

-- RLS is enabled on every exposed relation, including tables with no direct policies.
alter table public.families enable row level security;
alter table public.child_profiles enable row level security;
alter table public.parent_memberships enable row level security;
alter table public.device_assignments enable row level security;
alter table public.profile_balances enable row level security;
alter table public.xp_evidence_events enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.daily_award_claims enable row level security;
alter table public.offline_attempt_authorizations enable row level security;
alter table public.family_reward_settings enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_revisions enable row level security;
alter table public.reward_goals enable row level security;
alter table public.redemption_requests enable row level security;
alter table public.reward_image_assets enable row level security;
alter table public.migration_sessions enable row level security;
alter table public.migration_capture_requests enable row level security;
alter table public.audit_events enable row level security;

create policy family_parent_or_assigned_child_select on public.families for select to authenticated
using (private.is_parent_of_family(id) or exists (
  select 1 from public.device_assignments da
  where da.family_id = families.id and da.auth_user_id = auth.uid() and da.status = 'active'
));

create policy profiles_parent_or_own_child_select on public.child_profiles for select to authenticated
using (private.is_parent_of_family(family_id) or private.is_active_child_profile(id));

create policy memberships_parent_select on public.parent_memberships for select to authenticated
using (private.is_parent_of_family(family_id));

create policy assignments_parent_or_self_select on public.device_assignments for select to authenticated
using (private.is_parent_of_family(family_id) or auth_user_id = auth.uid());

create policy balances_parent_or_own_child_select on public.profile_balances for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy evidence_parent_or_own_child_select on public.xp_evidence_events for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy ledger_parent_or_own_child_select on public.xp_ledger for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy daily_claims_parent_or_own_child_select on public.daily_award_claims for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy settings_parent_or_assigned_child_select on public.family_reward_settings for select to authenticated
using (private.is_parent_of_family(family_id) or exists (
  select 1 from public.device_assignments da
  where da.family_id = family_reward_settings.family_id and da.auth_user_id = auth.uid() and da.status = 'active'
));

create policy rewards_parent_or_own_child_select on public.reward_items for select to authenticated
using (private.is_parent_of_family(family_id) or private.is_active_child_profile(profile_id));

create policy revisions_parent_or_own_child_select on public.reward_revisions for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy goals_parent_or_own_child_select on public.reward_goals for select to authenticated
using (private.is_parent_of_profile(profile_id) or private.is_active_child_profile(profile_id));

create policy redemptions_parent_or_own_child_select on public.redemption_requests for select to authenticated
using (private.is_parent_of_family(family_id) or private.is_active_child_profile(profile_id));

create policy images_parent_or_own_child_select on public.reward_image_assets for select to authenticated
using (private.is_parent_of_family(family_id) or private.is_active_child_profile(profile_id));

create policy migration_parent_or_source_child_select on public.migration_sessions for select to authenticated
using (private.is_parent_of_family(family_id) or private.is_active_child_profile(profile_id));

create policy migration_capture_parent_or_source_child_select on public.migration_capture_requests
for select to authenticated using (
  private.is_parent_of_family(family_id) or
  exists (
    select 1 from public.device_assignments d
    where d.id=assignment_id and d.profile_id=migration_capture_requests.profile_id
      and d.auth_user_id=auth.uid() and d.status='active'
  )
);

create policy audit_parent_select on public.audit_events for select to authenticated
using (private.is_parent_of_family(family_id));

revoke all on function private.is_parent_of_family(uuid) from public, anon;
revoke all on function private.is_active_child_profile(uuid) from public, anon;
revoke all on function private.is_parent_of_profile(uuid) from public, anon;
grant execute on function private.is_parent_of_family(uuid), private.is_active_child_profile(uuid),
  private.is_parent_of_profile(uuid) to authenticated;

revoke all on function private.require_authenticated_uid(), private.require_parent(uuid, boolean),
  private.require_active_assignment(), private.require_profile_cloud_authoritative(uuid), private.rate_limit(text, text, integer, interval),
  private.safe_product_url(text) from public, anon, authenticated;
