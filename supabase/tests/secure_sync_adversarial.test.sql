begin;

create extension if not exists pgtap with schema extensions;

select plan(64);

-- Test-only fixture helpers live inside this rolled-back transaction. Production
-- migrations must not create them.
create schema test_support;
create function test_support.as_user(p_user_id uuid) returns void
language plpgsql set search_path = pg_catalog as $$
declare
  v_is_anonymous boolean := p_user_id <> '90000000-0000-4000-8000-000000000001'::uuid;
  v_aal text := case when v_is_anonymous then 'aal1' else 'aal2' end;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_user_id, 'role', 'authenticated', 'aal', v_aal,
    'is_anonymous', v_is_anonymous)::text, true);
end;
$$;

create function test_support.reset_fixture() returns void language plpgsql as $$ begin null; end $$;
create function test_support.seed_known_invitation() returns void
language plpgsql security definer set search_path = pg_catalog, public, private, extensions as $$
begin
  update private.enrollment_invitations set consumed_at = clock_timestamp()
    where profile_id = 'a0000000-0000-4000-8000-000000000003'::uuid and consumed_at is null;
  insert into private.enrollment_invitations(
    id, family_id, profile_id, secret_hash, created_by, expires_at
  ) values (
    'f0000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000003',
    encode(extensions.digest(convert_to(repeat('a', 64), 'UTF8'), 'sha256'), 'hex'),
    '90000000-0000-4000-8000-000000000001', clock_timestamp() + interval '10 minutes'
  );
end;
$$;
create function test_support.seed_secure_sync_fixture() returns void
language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  insert into auth.users(id, role, aud, email) values
    ('90000000-0000-4000-8000-000000000001','authenticated','authenticated','parent@test.invalid'),
    ('90000000-0000-4000-8000-000000000002','authenticated','authenticated',null),
    ('90000000-0000-4000-8000-000000000003','authenticated','authenticated',null),
    ('90000000-0000-4000-8000-000000000004','authenticated','authenticated',null),
    ('90000000-0000-4000-8000-000000000005','authenticated','authenticated',null);
  insert into public.families(id,name) values
    ('80000000-0000-4000-8000-000000000001','Secure sync test family');
  insert into public.child_profiles(
    id,family_id,display_name,local_profile_id,kind,sync_authoritative_at
  ) values
    ('a0000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','Bianca','bianca','child',transaction_timestamp()),
    ('a0000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001','Calista','calista','child',transaction_timestamp()),
    ('a0000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000001','Test','test','test',null);
  insert into public.parent_memberships(family_id,auth_user_id,is_owner) values
    ('80000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',true);
  insert into public.device_assignments(id,family_id,profile_id,auth_user_id,status) values
    ('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','active'),
    ('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003','active'),
    ('81000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000004','revoked');
  insert into public.profile_balances(profile_id) values
    ('a0000000-0000-4000-8000-000000000001'),
    ('a0000000-0000-4000-8000-000000000002');
  insert into private.profile_xp_facts(profile_id) values
    ('a0000000-0000-4000-8000-000000000001'),
    ('a0000000-0000-4000-8000-000000000002');
end;
$$;
grant usage on schema test_support to authenticated;
grant execute on all functions in schema test_support to authenticated;

select test_support.reset_fixture();
select test_support.seed_secure_sync_fixture();

select is((select count(*) from private.content_catalog), 158::bigint,
  'checked-in catalog exposes every current analogy and Vocabulary V1 question');
select is((select public from storage.buckets where id = 'reward-images'), false,
  'reward image bucket is private');
select is((select file_size_limit from storage.buckets where id = 'reward-images'), 5242880::bigint,
  'reward image bucket enforces the 5 MB ceiling');
select is((select allowed_mime_types from storage.buckets where id = 'reward-images'),
  array['image/jpeg','image/png','image/webp']::text[],
  'reward image bucket allows only JPEG, PNG, and WebP');
select is((select count(*) from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd in ('INSERT','UPDATE','DELETE')
    and ('authenticated' = any(roles) or 'public' = any(roles))), 0::bigint,
  'authenticated clients have no direct reward image or backup write policy');

-- Stable fixture IDs:
-- parent  90000000-0000-4000-8000-000000000001
-- Bianca  90000000-0000-4000-8000-000000000002
-- Calista 90000000-0000-4000-8000-000000000003
-- revoked 90000000-0000-4000-8000-000000000004
-- fresh   90000000-0000-4000-8000-000000000005
-- Bianca profile a0000000-0000-4000-8000-000000000001
-- Calista profile a0000000-0000-4000-8000-000000000002
-- Test profile a0000000-0000-4000-8000-000000000003

select test_support.as_user('90000000-0000-4000-8000-000000000002'::uuid);

select is((select count(*) from public.child_profiles), 1::bigint,
  'Bianca identity sees exactly its assigned child profile');
select is((select count(*) from public.child_profiles where id = 'a0000000-0000-4000-8000-000000000002'::uuid), 0::bigint,
  'Bianca identity cannot see Calista profile');
select is((select count(*) from public.reward_items where profile_id = 'a0000000-0000-4000-8000-000000000002'::uuid), 0::bigint,
  'Bianca identity cannot see Calista rewards');
select is((select count(*) from public.reward_revisions where profile_id = 'a0000000-0000-4000-8000-000000000002'::uuid), 0::bigint,
  'Bianca identity cannot see Calista reward revisions');
select is((select count(*) from public.redemption_requests where profile_id = 'a0000000-0000-4000-8000-000000000002'::uuid), 0::bigint,
  'Bianca identity cannot see Calista redemptions');
select is((select count(*) from public.audit_events), 0::bigint,
  'child identity cannot read family audit events');
select is((select count(*) from pg_indexes
  where schemaname = 'public' and tablename = 'daily_award_claims'
    and indexdef like 'CREATE UNIQUE INDEX%profile_id, family_local_date, award_kind%'), 1::bigint,
  'daily awards have a per-profile, per-LA-day, per-kind uniqueness constraint');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%')), 0::bigint,
  'every SECURITY DEFINER function fixes its search_path');

select throws_ok(
  $$ insert into public.xp_ledger (profile_id, kind, lifetime_delta, available_delta, idempotency_key)
     values ('a0000000-0000-4000-8000-000000000001', 'earned', 50000, 50000, gen_random_uuid()) $$,
  '42501', null, 'child cannot directly insert XP ledger rows');
select throws_ok(
  $$ update public.profile_balances set available_xp = 50000 $$,
  '42501', null, 'child cannot directly update balances');
select throws_ok(
  $$ insert into public.parent_memberships (family_id, auth_user_id, is_owner)
     values (gen_random_uuid(), auth.uid(), true) $$,
  '42501', null, 'child cannot promote itself to parent');
select throws_ok(
  $$ update public.device_assignments set profile_id = 'a0000000-0000-4000-8000-000000000002'::uuid $$,
  '42501', null, 'child cannot switch its enrolled profile');
select throws_ok(
  $$ update public.reward_items set authoritative_xp_cost = 1 $$,
  '42501', null, 'child cannot directly set authoritative reward cost');
select throws_ok(
  $$ update public.redemption_requests set status = 'approved' $$,
  '42501', null, 'child cannot approve a redemption');
select throws_ok(
  $$ delete from public.audit_events $$,
  '42501', null, 'child cannot delete audit rows');

select throws_ok(
  $$ select public.submit_reward_proposal(
       'b0000000-0000-4000-8000-000000000001'::uuid,
       'b1000000-0000-4000-8000-000000000001'::uuid,
       'a0000000-0000-4000-8000-000000000002'::uuid,
       'Other child reward', null, 1000, null,
       'b2000000-0000-4000-8000-000000000001'::uuid) $$,
  '42501', null, 'Bianca cannot submit a proposal for Calista');

select lives_ok(
  $$ select public.submit_reward_proposal(
       'b0000000-0000-4000-8000-000000000002'::uuid,
       'b1000000-0000-4000-8000-000000000002'::uuid,
       'a0000000-0000-4000-8000-000000000001'::uuid,
       'Safe reward', 'https://example.com/item', 1000, null,
       'b2000000-0000-4000-8000-000000000002'::uuid) $$,
  'Bianca can submit its own safe proposal');
select is(
  (select count(*) from public.reward_revisions where profile_id = 'a0000000-0000-4000-8000-000000000001'::uuid and status = 'pending'),
  1::bigint, 'child proposal is pending, not self-approved');

select throws_ok(
  $$ select public.submit_reward_proposal(
       'b0000000-0000-4000-8000-000000000003'::uuid,
       'b1000000-0000-4000-8000-000000000003'::uuid,
       'a0000000-0000-4000-8000-000000000001'::uuid,
       'Unsafe link', 'javascript:alert(1)', 1000, null,
       'b2000000-0000-4000-8000-000000000003'::uuid) $$,
  null, null, 'javascript product URL is rejected');
select throws_ok(
  $$ select public.submit_reward_proposal(
       'b0000000-0000-4000-8000-000000000004'::uuid,
       'b1000000-0000-4000-8000-000000000004'::uuid,
       'a0000000-0000-4000-8000-000000000001'::uuid,
       'Unsafe link', 'data:text/html,boom', 1000, null,
       'b2000000-0000-4000-8000-000000000004'::uuid) $$,
  null, null, 'data product URL is rejected');

-- transaction_timestamp() is fixed for this transaction, so an unknown-response
-- replay uses the exact same occurred_at as its original envelope.
select lives_ok(
  $$ select public.submit_xp_evidence(
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c1000000-0000-4000-8000-000000000001'::uuid, 1,
       'analogy_bridge_lock', 'P1', 1, 1, '{}'::jsonb,
       encode(extensions.digest(convert_to('{}'::jsonb::text, 'UTF8'), 'sha256'), 'hex'),
       transaction_timestamp(), null) $$,
  'first XP evidence submission succeeds');
select lives_ok(
  $$ select public.submit_xp_evidence(
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c1000000-0000-4000-8000-000000000001'::uuid, 1,
       'analogy_bridge_lock', 'P1', 1, 1, '{}'::jsonb,
       encode(extensions.digest(convert_to('{}'::jsonb::text, 'UTF8'), 'sha256'), 'hex'),
       transaction_timestamp(), null) $$,
  'exact XP evidence replay succeeds idempotently');
select is(
  (select count(*) from public.xp_ledger where idempotency_key = 'c0000000-0000-4000-8000-000000000001'::uuid),
  1::bigint, 'replayed XP evidence creates one ledger event');
select throws_ok(
  $$ select public.submit_xp_evidence(
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c1000000-0000-4000-8000-000000000001'::uuid, 1,
       'analogy_final', 'P1', 1, 1, '{"choice":"A"}'::jsonb,
       encode(extensions.digest(convert_to('{"choice":"A"}'::jsonb::text, 'UTF8'), 'sha256'), 'hex'),
       transaction_timestamp(), null) $$,
  null, null, 'reused event ID with changed payload is rejected');
select lives_ok(
  $$ select public.submit_xp_evidence(
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c1000000-0000-4000-8000-000000000002'::uuid, 2,
       'analogy_bridge_lock', 'P2', 1, 1,
       '{"profile_id":"a0000000-0000-4000-8000-000000000002"}'::jsonb,
       encode(extensions.digest(convert_to('{"profile_id":"a0000000-0000-4000-8000-000000000002"}'::jsonb::text, 'UTF8'), 'sha256'), 'hex'),
       transaction_timestamp(), null) $$,
  'hostile profile field cannot redirect otherwise valid XP evidence');
select is((select profile_id from public.xp_evidence_events
  where event_id = 'c0000000-0000-4000-8000-000000000002'::uuid),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'XP evidence always derives Bianca profile from its enrolled identity');

-- A revoked device loses RPC authority even for an operation queued before revocation.
select test_support.as_user('90000000-0000-4000-8000-000000000004'::uuid);
select throws_ok(
  $$ select public.submit_xp_evidence(
       'c0000000-0000-4000-8000-000000000003'::uuid,
       'c1000000-0000-4000-8000-000000000003'::uuid, 1,
       'analogy_bridge_lock', 'P2', 1, 1, '{}'::jsonb,
       encode(extensions.digest(convert_to('{}'::jsonb::text, 'UTF8'), 'sha256'), 'hex'),
       transaction_timestamp(), null) $$,
  '42501', null, 'revoked device cannot replay queued XP');
select throws_ok(
  $$ select public.submit_reward_revision(
       'b0000000-0000-4000-8000-000000000002'::uuid,
       'd0000000-0000-4000-8000-000000000001'::uuid, 0,
       'Revoked edit', null, null, null,
       'd1000000-0000-4000-8000-000000000001'::uuid) $$,
  '42501', null, 'revoked device cannot replay a queued reward edit');

-- Parent-only operations are auditable and idempotent.
select test_support.as_user('90000000-0000-4000-8000-000000000001'::uuid);
select lives_ok(
  $$ select public.adjust_xp(
       'a0000000-0000-4000-8000-000000000001'::uuid,
       25, 25, 'manual adjustment',
       'e0000000-0000-4000-8000-000000000001'::uuid) $$,
  'parent XP adjustment succeeds');
select lives_ok(
  $$ select public.adjust_xp(
       'a0000000-0000-4000-8000-000000000001'::uuid,
       25, 25, 'manual adjustment',
       'e0000000-0000-4000-8000-000000000001'::uuid) $$,
  'parent XP adjustment replay is idempotent');
select is(
  (select count(*) from public.xp_ledger where idempotency_key = 'e0000000-0000-4000-8000-000000000001'::uuid),
  1::bigint, 'parent adjustment creates one immutable ledger event');
select is(
  (select count(*) from public.audit_events
    where profile_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      and actor_user_id = '90000000-0000-4000-8000-000000000001'::uuid
      and action = 'xp_adjusted'),
  1::bigint, 'parent adjustment creates one audit event');

select throws_ok(
  $$ update public.audit_events set action = 'tampered' $$,
  '42501', null, 'parent cannot rewrite audit history');
select throws_ok(
  $$ delete from public.xp_ledger $$,
  '42501', null, 'parent cannot delete ledger history');

select lives_ok(
  $$ select public.award_daily_xp(
       'a0000000-0000-4000-8000-000000000001'::uuid, 'exit_ticket',
       'e1000000-0000-4000-8000-000000000001'::uuid, 'LA-day claim') $$,
  'first America/Los_Angeles daily claim succeeds');
select lives_ok(
  $$ select public.award_daily_xp(
       'a0000000-0000-4000-8000-000000000001'::uuid, 'exit_ticket',
       'e1000000-0000-4000-8000-000000000002'::uuid, 'duplicate LA-day claim') $$,
  'second claim is a safe zero-delta duplicate, not a second award');
select is((select count(*) from public.daily_award_claims
  where profile_id = 'a0000000-0000-4000-8000-000000000001'::uuid
    and family_local_date = (clock_timestamp() at time zone 'America/Los_Angeles')::date
    and award_kind = 'exit_ticket'), 1::bigint,
  'duplicate daily operation cannot create a second LA-day claim');

select lives_ok(
  $$ select public.review_reward_revision(
       'b1000000-0000-4000-8000-000000000002'::uuid, 'approve',
       'Approved test reward', null, 2500, 350, false,
       'approved for test', 0, 'b3000000-0000-4000-8000-000000000001'::uuid) $$,
  'parent can approve Bianca proposal and set authoritative XP cost');
select is((select authoritative_xp_cost from public.reward_items
  where id = 'b0000000-0000-4000-8000-000000000002'::uuid), 350,
  'parent-selected authoritative cost is stored on the reward item');

select test_support.as_user('90000000-0000-4000-8000-000000000002'::uuid);
select lives_ok(
  $$ select public.set_reward_goal(
       'a0000000-0000-4000-8000-000000000001'::uuid,
       'b0000000-0000-4000-8000-000000000002'::uuid, 0,
       'b3000000-0000-4000-8000-000000000002'::uuid) $$,
  'child can select its own approved reward as a goal');
select lives_ok(
  $$ select public.submit_reward_revision(
       'b0000000-0000-4000-8000-000000000002'::uuid,
       'b1000000-0000-4000-8000-000000000005'::uuid, 1,
       'Safe reward edited by child', 'https://example.com/edited', 1250, null,
       'b3000000-0000-4000-8000-000000000003'::uuid) $$,
  'child edit of an approved reward creates a revision');
select is((select approved_revision_id from public.reward_items
  where id = 'b0000000-0000-4000-8000-000000000002'::uuid),
  'b1000000-0000-4000-8000-000000000002'::uuid,
  'child edit does not replace the currently approved revision');
select is((select authoritative_xp_cost from public.reward_items
  where id = 'b0000000-0000-4000-8000-000000000002'::uuid), 350,
  'child edit cannot alter authoritative XP cost');
select is((select status from public.reward_revisions
  where id = 'b1000000-0000-4000-8000-000000000005'::uuid),
  'pending'::public.reward_revision_status,
  'child-edited revision returns to pending review');

select test_support.as_user('90000000-0000-4000-8000-000000000001'::uuid);
select lives_ok(
  $$ select public.adjust_xp(
       'a0000000-0000-4000-8000-000000000001'::uuid,
       500, 500, 'fund decline-path redemption fixture',
       'b4000000-0000-4000-8000-000000000001'::uuid) $$,
  'parent can fund the redemption decline-path fixture');

select test_support.as_user('90000000-0000-4000-8000-000000000002'::uuid);
select lives_ok(
  $$ select public.request_redemption(
       'b5000000-0000-4000-8000-000000000001'::uuid,
       'b0000000-0000-4000-8000-000000000002'::uuid, 2,
       'b6000000-0000-4000-8000-000000000001'::uuid) $$,
  'child can request redemption against the still-approved revision');

select test_support.as_user('90000000-0000-4000-8000-000000000001'::uuid);
select lives_ok(
  $$ select public.resolve_redemption(
       'b5000000-0000-4000-8000-000000000001'::uuid,
       'decline', 0, 'declined in adversarial fixture',
       'b7000000-0000-4000-8000-000000000001'::uuid) $$,
  'declining a redemption succeeds without dereferencing an unassigned ledger row');
select is((select status from public.redemption_requests
  where id = 'b5000000-0000-4000-8000-000000000001'::uuid),
  'declined'::public.redemption_status,
  'declined redemption stores the declined terminal status');
select is((select spend_ledger_id from public.redemption_requests
  where id = 'b5000000-0000-4000-8000-000000000001'::uuid), null::uuid,
  'declined redemption has no spend ledger assignment');

-- Invitations are single-use and server verified.
select lives_ok(
  $$ select public.create_enrollment_invitation(
       'a0000000-0000-4000-8000-000000000003'::uuid) $$,
  'parent can create a short-lived invitation for Test');
select test_support.seed_known_invitation();

select test_support.as_user('90000000-0000-4000-8000-000000000005'::uuid);
select lives_ok(
  $$ select public.consume_enrollment_invitation(
       repeat('a', 64),
       'test-fixture-verifier') $$,
  'target device consumes invitation once');
select throws_ok(
  $$ select public.consume_enrollment_invitation(
       repeat('a', 64),
       'test-fixture-verifier') $$,
  null, null, 'invitation replay is rejected');

select test_support.as_user('90000000-0000-4000-8000-000000000001'::uuid);
select is((select count(*) from public.device_assignments
  where auth_user_id = '90000000-0000-4000-8000-000000000005'::uuid
    and profile_id = 'a0000000-0000-4000-8000-000000000003'::uuid
    and status = 'active'), 1::bigint,
  'consumed invitation creates exactly one permanent device assignment');

-- Migration claims are idempotent: the preserved 200-XP fresh start is not doubled.
reset role;
set local role service_role;
select lives_ok(
  $$ select public.internal_register_migration_backup(
       'ab000000-0000-4000-8000-000000000001'::uuid,
       (select family_id from public.child_profiles where id='a0000000-0000-4000-8000-000000000003'::uuid),
       'a0000000-0000-4000-8000-000000000003'::uuid,
       'migration-backups/test/encrypted-backup.bin', repeat('7',64), now()+interval '31 days') $$,
  'service-side encrypted backup attestation is registered');
reset role;
select test_support.as_user('90000000-0000-4000-8000-000000000001'::uuid);
select lives_ok(
  $$ select public.stage_migration_snapshot(
       'ab000000-0000-4000-8000-000000000001'::uuid,
       'a0000000-0000-4000-8000-000000000003'::uuid,
       'test-device-raw-v8',
       'ac000000-0000-4000-8000-000000000001'::uuid,
       repeat('5', 64), repeat('6', 64),
       '{"dataVersion":1,"lifetimeXp":200,"availableXp":200}'::jsonb,
       'migration-backups/test/encrypted-backup.bin', repeat('7', 64)) $$,
  'Test migration snapshot stages');
select lives_ok(
  $$ select public.confirm_migration(
       'ab000000-0000-4000-8000-000000000001'::uuid,
       repeat('5', 64), repeat('6', 64), true) $$,
  'Test migration confirms');
select lives_ok(
  $$ select public.confirm_migration(
       'ab000000-0000-4000-8000-000000000001'::uuid,
       repeat('5', 64), repeat('6', 64), true) $$,
  'interrupted confirmation retry is idempotent');
select is(
  (select lifetime_xp from public.profile_balances where profile_id = 'a0000000-0000-4000-8000-000000000003'::uuid),
  200::bigint, 'migration keeps lifetime XP at 200, not 400');
select is(
  (select available_xp from public.profile_balances where profile_id = 'a0000000-0000-4000-8000-000000000003'::uuid),
  200::bigint, 'migration keeps available XP at 200, not 400');

select * from finish();
rollback;
