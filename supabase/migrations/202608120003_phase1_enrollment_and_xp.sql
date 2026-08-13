-- SSAT Quest secure synchronization, Phase 1: enrollment, XP, daily awards.

create or replace function private.write_audit(
  p_family_id uuid, p_profile_id uuid, p_actor_kind text, p_action text,
  p_target_table text, p_target_id text, p_reason text,
  p_before jsonb default null, p_after jsonb default null
) returns void
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  insert into public.audit_events(
    family_id, profile_id, actor_user_id, actor_kind, action, target_table,
    target_id, reason, before_state, after_state
  ) values (
    p_family_id, p_profile_id, auth.uid(), p_actor_kind, p_action, p_target_table,
    p_target_id, p_reason, p_before, p_after
  );
$$;

create or replace function private.apply_ledger(
  p_profile_id uuid,
  p_kind public.xp_ledger_kind,
  p_lifetime_delta bigint,
  p_available_delta bigint,
  p_idempotency_key uuid,
  p_reason text,
  p_source_event_id uuid default null,
  p_source_redemption_id uuid default null,
  p_reverses_ledger_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.xp_ledger
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_balance public.profile_balances;
  v_ledger public.xp_ledger;
begin
  if p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  select * into v_ledger from public.xp_ledger
    where profile_id = p_profile_id and idempotency_key = p_idempotency_key;
  if found then
    if v_ledger.kind <> p_kind or v_ledger.lifetime_delta <> p_lifetime_delta
       or v_ledger.available_delta <> p_available_delta
       or v_ledger.source_event_id is distinct from p_source_event_id
       or v_ledger.source_redemption_id is distinct from p_source_redemption_id
       or v_ledger.reverses_ledger_id is distinct from p_reverses_ledger_id then
      raise exception 'idempotency key reused with different ledger payload' using errcode = '23505';
    end if;
    return v_ledger;
  end if;

  insert into public.profile_balances(profile_id) values (p_profile_id)
    on conflict (profile_id) do nothing;
  select * into v_balance from public.profile_balances where profile_id = p_profile_id for update;
  if v_balance.lifetime_xp + p_lifetime_delta < 0
     or v_balance.available_xp + p_available_delta < 0 then
    raise exception 'insufficient XP or invalid negative lifetime' using errcode = '23514';
  end if;

  insert into public.xp_ledger(
    profile_id, kind, lifetime_delta, available_delta, source_event_id,
    source_redemption_id, reverses_ledger_id, idempotency_key, actor_user_id,
    reason, metadata
  ) values (
    p_profile_id, p_kind, p_lifetime_delta, p_available_delta, p_source_event_id,
    p_source_redemption_id, p_reverses_ledger_id, p_idempotency_key, auth.uid(),
    p_reason, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_ledger;

  update public.profile_balances set
    lifetime_xp = lifetime_xp + p_lifetime_delta,
    available_xp = available_xp + p_available_delta,
    version = version + 1,
    updated_at = now()
  where profile_id = p_profile_id;
  return v_ledger;
end;
$$;

create or replace function public.create_enrollment_invitation(p_profile_id uuid,p_installation_label text default null)
returns table(invitation_id uuid, invitation_secret text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public, extensions
as $$
declare
  v_family_id uuid;
  v_uid uuid;
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select family_id into v_family_id from public.child_profiles
    where id = p_profile_id and archived_at is null;
  if not found then raise exception 'profile not found'; end if;
  v_uid := private.require_parent(v_family_id, true);
  perform private.rate_limit(v_uid::text, 'create_enrollment_invitation', 3, interval '1 hour');
  if exists (select 1 from public.device_assignments where profile_id = p_profile_id and status = 'active') then
    raise exception 'profile already has an active installation';
  end if;
  update private.enrollment_invitations set consumed_at = now()
    where profile_id = p_profile_id and consumed_at is null;
  insert into private.enrollment_invitations(
    family_id, profile_id, installation_label, secret_hash, created_by, expires_at
  ) values (
    v_family_id, p_profile_id, nullif(btrim(p_installation_label),''),
    encode(extensions.digest(convert_to(v_secret, 'UTF8'), 'sha256'), 'hex'),
    v_uid, now() + interval '10 minutes'
  ) returning id, private.enrollment_invitations.expires_at
    into invitation_id, expires_at;
  invitation_secret := v_secret;
  perform private.write_audit(v_family_id, p_profile_id, 'parent', 'enrollment_invitation_created',
    'enrollment_invitations', invitation_id::text, null);
  return next;
end;
$$;

create or replace function public.consume_enrollment_invitation(
  p_invitation_secret text,
  p_installation_label text default null
) returns public.device_assignments
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_inv private.enrollment_invitations;
  v_assignment public.device_assignments;
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'child enrollment requires a fresh anonymous identity' using errcode = '42501';
  end if;
  if p_installation_label is not null and char_length(btrim(p_installation_label)) > 120 then
    return null;
  end if;
  if p_invitation_secret !~ '^[0-9a-f]{64}$' then
    perform private.rate_limit(v_uid::text, 'consume_enrollment_invitation', 5, interval '15 minutes');
    return null;
  end if;
  perform private.rate_limit(v_uid::text, 'consume_enrollment_invitation', 5, interval '15 minutes');
  v_hash := encode(extensions.digest(convert_to(p_invitation_secret, 'UTF8'), 'sha256'), 'hex');
  select * into v_inv from private.enrollment_invitations
    where secret_hash = v_hash for update;
  if not found or v_inv.consumed_at is not null or v_inv.expires_at <= now() then
    return null;
  end if;
  if exists (select 1 from public.parent_memberships where auth_user_id = v_uid and revoked_at is null) then
    raise exception 'parent identities cannot enroll as child devices' using errcode = '42501';
  end if;
  if exists (select 1 from public.device_assignments where auth_user_id = v_uid) then
    return null;
  end if;
  if exists (select 1 from public.device_assignments where profile_id = v_inv.profile_id and status = 'active') then
    return null;
  end if;

  insert into public.device_assignments(family_id, profile_id, auth_user_id, installation_label)
  values (v_inv.family_id, v_inv.profile_id, v_uid, coalesce(nullif(btrim(p_installation_label), ''),v_inv.installation_label))
  returning * into v_assignment;
  if v_inv.replacement_for_assignment_id is not null then
    update public.device_assignments set replaced_by=v_assignment.id
      where id=v_inv.replacement_for_assignment_id and status='replaced';
  end if;
  update private.enrollment_invitations set consumed_at = now(), consumed_by = v_uid
    where id = v_inv.id;
  insert into public.profile_balances(profile_id) values (v_inv.profile_id) on conflict do nothing;
  insert into private.profile_xp_facts(profile_id) values (v_inv.profile_id) on conflict do nothing;
  insert into public.reward_goals(profile_id, updated_by) values (v_inv.profile_id, v_uid) on conflict do nothing;
  perform private.write_audit(v_inv.family_id, v_inv.profile_id, 'child_device', 'device_enrolled',
    'device_assignments', v_assignment.id::text, null, null, to_jsonb(v_assignment));
  return v_assignment;
end;
$$;

create or replace function public.create_replacement_invitation(
 p_assignment_id uuid,p_reason text
) returns table(invitation_id uuid,invitation_secret text,expires_at timestamptz)
language plpgsql volatile security definer
set search_path=pg_catalog,private,public,extensions
as $$
declare v_old public.device_assignments; v_secret text:=encode(extensions.gen_random_bytes(32),'hex');
begin
 select * into v_old from public.device_assignments where id=p_assignment_id for update;
 if not found or v_old.status<>'active' then raise exception 'active assignment not found'; end if;
 perform private.require_parent(v_old.family_id,true);
 if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'replacement reason required'; end if;
 perform private.rate_limit(auth.uid()::text,'create_replacement_invitation',3,interval '1 hour');
 update public.device_assignments set status='replaced',revoked_at=now(),revoked_by=auth.uid() where id=v_old.id;
 update private.enrollment_invitations set consumed_at=now() where profile_id=v_old.profile_id and consumed_at is null;
 insert into private.enrollment_invitations(family_id,profile_id,secret_hash,created_by,expires_at,replacement_for_assignment_id)
 values(v_old.family_id,v_old.profile_id,encode(extensions.digest(convert_to(v_secret,'UTF8'),'sha256'),'hex'),auth.uid(),now()+interval '10 minutes',v_old.id)
 returning id,private.enrollment_invitations.expires_at into invitation_id,expires_at;
 invitation_secret:=v_secret;
 perform private.write_audit(v_old.family_id,v_old.profile_id,'parent','device_replacement_started','device_assignments',v_old.id::text,p_reason,to_jsonb(v_old),jsonb_build_object('invitationId',invitation_id));
 return next;
end $$;

create or replace function public.revoke_device(
  p_assignment_id uuid,
  p_reason text,
  p_replacement_assignment_id uuid default null
) returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_assignment public.device_assignments;
begin
  select * into v_assignment from public.device_assignments where id = p_assignment_id for update;
  if not found then raise exception 'assignment not found'; end if;
  perform private.require_parent(v_assignment.family_id, true);
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason required'; end if;
  if v_assignment.status <> 'active' then return; end if;
  update public.device_assignments set
    status = case when p_replacement_assignment_id is null then 'revoked' else 'replaced' end,
    revoked_at = now(), revoked_by = auth.uid(), replaced_by = p_replacement_assignment_id
  where id = p_assignment_id;
  perform private.write_audit(v_assignment.family_id, v_assignment.profile_id, 'parent', 'device_revoked',
    'device_assignments', p_assignment_id::text, p_reason, to_jsonb(v_assignment),
    (select to_jsonb(x) from public.device_assignments x where x.id = p_assignment_id));
end;
$$;

create or replace function public.issue_offline_attempt_authorizations(p_count integer default 250)
returns table(token_id uuid, token_secret text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public, extensions
as $$
declare
  v_assignment public.device_assignments := private.require_active_assignment();
  v_secret text;
  v_id uuid;
  v_expires timestamptz := now() + interval '30 days';
  v_existing integer;
  i integer;
begin
  if p_count < 1 or p_count > 250 then raise exception 'count must be between 1 and 250'; end if;
  -- Call rate and total outstanding-token limits both apply. A child cannot
  -- mint 250 tokens hundreds of times and then backdate months of evidence.
  perform private.rate_limit(auth.uid()::text, 'issue_offline_attempt_authorizations', 10, interval '1 day');
  if (select count(*) from public.offline_attempt_authorizations
      where assignment_id=v_assignment.id and issued_at>=now()-interval '1 day') + p_count > 250 then
    raise exception '250 authorization daily issuance limit exceeded';
  end if;
  select count(*) into v_existing from public.offline_attempt_authorizations
    where assignment_id = v_assignment.id and consumed_at is null and expires_at > now();
  if v_existing + p_count > 250 then raise exception '250 unused authorization limit exceeded'; end if;
  for i in 1..p_count loop
    v_secret := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.offline_attempt_authorizations(
      assignment_id, profile_id, token_hash, expires_at
    ) values (
      v_assignment.id, v_assignment.profile_id,
      encode(extensions.digest(convert_to(v_secret, 'UTF8'), 'sha256'), 'hex'), v_expires
    ) returning id into v_id;
    token_id := v_id; token_secret := v_secret; expires_at := v_expires; return next;
  end loop;
end;
$$;

create or replace function private.consume_offline_authorization(
  p_assignment_id uuid, p_profile_id uuid, p_secret text, p_attempt_id uuid,
  p_content_id text, p_occurred_at timestamptz
) returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_auth public.offline_attempt_authorizations;
begin
  if p_secret is null then return false; end if;
  if p_secret !~ '^[0-9a-f]{64}$' then raise exception 'invalid offline authorization'; end if;
  select * into v_auth from public.offline_attempt_authorizations
  where assignment_id = p_assignment_id and profile_id = p_profile_id
    and token_hash = encode(extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256'), 'hex')
    and expires_at > now()
  for update;
  if not found then raise exception 'invalid, expired, or used offline authorization'; end if;
  if p_occurred_at < v_auth.issued_at - interval '5 minutes'
    or p_occurred_at > v_auth.expires_at then
    raise exception 'evidence timestamp is outside authorization validity';
  end if;
  if v_auth.consumed_at is not null then
    if v_auth.consumed_attempt_id <> p_attempt_id or v_auth.consumed_content_id <> p_content_id then
      raise exception 'offline authorization already bound to another attempt';
    end if;
    return true;
  end if;
  update public.offline_attempt_authorizations set consumed_at = now(),
    consumed_attempt_id = p_attempt_id, consumed_content_id = p_content_id
    where id = v_auth.id;
  return true;
end;
$$;

create or replace function private.local_date(p_when timestamptz)
returns date
language sql
immutable
security invoker
set search_path = pg_catalog
as $$ select (p_when at time zone 'America/Los_Angeles')::date $$;

create or replace function private.analogy_xp(p_base integer, p_difficulty integer)
returns integer language sql immutable security invoker set search_path = pg_catalog
as $$ select round(p_base * case p_difficulty when 1 then 1 when 2 then 1.5 else 2 end)::integer $$;

create or replace function private.create_attempt_if_needed(
  p_assignment public.device_assignments, p_attempt_id uuid, p_content_id text
) returns private.xp_attempt_state
language plpgsql
volatile security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_state private.xp_attempt_state;
  v_facts private.profile_xp_facts;
  v_last bigint;
  v_mode text;
begin
  select * into v_state from private.xp_attempt_state
    where assignment_id = p_assignment.id and attempt_id = p_attempt_id for update;
  if found then
    if v_state.content_id <> p_content_id then raise exception 'attempt content cannot change'; end if;
    return v_state;
  end if;
  insert into private.profile_xp_facts(profile_id) values (p_assignment.profile_id) on conflict do nothing;
  select * into v_facts from private.profile_xp_facts where profile_id = p_assignment.profile_id for update;
  select max(completed_ordinal) into v_last from private.analogy_completion_facts
    where profile_id = p_assignment.profile_id and content_id = p_content_id;
  v_mode := case when v_last is null then 'full'
    when v_facts.completed_analogy_count - v_last >= 5 then 'repeat' else 'none' end;
  insert into private.xp_attempt_state(assignment_id, attempt_id, profile_id, content_id, mode)
    values (p_assignment.id, p_attempt_id, p_assignment.profile_id, p_content_id, v_mode)
    returning * into v_state;
  return v_state;
end;
$$;

create or replace function public.submit_xp_evidence(
  p_event_id uuid,
  p_attempt_id uuid,
  p_device_sequence bigint,
  p_evidence_kind text,
  p_content_id text,
  p_content_version integer,
  p_rule_version integer,
  p_payload jsonb,
  p_payload_hash text,
  p_occurred_at timestamptz,
  p_offline_authorization text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, private, public, extensions
as $$
declare
  v_assignment public.device_assignments := private.require_active_assignment();
  v_existing public.xp_evidence_events;
  v_catalog private.content_catalog;
  v_state private.xp_attempt_state;
  v_hash text;
  v_award integer := 0;
  v_status public.evidence_status := 'accepted';
  v_review text;
  v_local_date date;
  v_choice text;
  v_correct boolean;
  v_facts private.profile_xp_facts;
  v_vocab private.vocab_xp_facts;
  v_daily_count integer;
  v_daily_xp bigint;
  v_ledger public.xp_ledger;
  v_has_authorization boolean := false;
  v_force_review boolean := false;
begin
  if p_event_id is null or p_attempt_id is null or p_device_sequence < 1 then raise exception 'invalid event envelope'; end if;
  if not exists(select 1 from public.child_profiles
    where id=v_assignment.profile_id and sync_authoritative_at is not null) then
    raise exception 'profile migration is not confirmed' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'payload must be an object'; end if;
  if p_rule_version <> 1 then raise exception 'unsupported XP rule version'; end if;
  -- The server owns the canonical digest; browser hashing is only an accidental
  -- corruption signal because JSON and PostgreSQL jsonb have different encodings.
  v_hash := encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
  if p_payload_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid payload hash shape'; end if;

  select * into v_existing from public.xp_evidence_events where event_id = p_event_id;
  if found then
    if v_existing.payload_hash <> v_hash or v_existing.profile_id <> v_assignment.profile_id
       or v_existing.assignment_id <> v_assignment.id or v_existing.attempt_id <> p_attempt_id
       or v_existing.device_sequence <> p_device_sequence or v_existing.evidence_kind <> p_evidence_kind
       or v_existing.content_id <> p_content_id or v_existing.content_version <> p_content_version
       or v_existing.rule_version <> p_rule_version or v_existing.payload <> p_payload
       or v_existing.occurred_at <> p_occurred_at then
      raise exception 'event id reused with different payload or identity' using errcode = '23505';
    end if;
    return jsonb_build_object('eventId', v_existing.event_id, 'status', v_existing.status,
      'awardedXp', v_existing.awarded_xp, 'duplicate', true,
      'balance', (select to_jsonb(b) from public.profile_balances b where b.profile_id = v_assignment.profile_id));
  end if;

  select * into v_catalog from private.content_catalog
    where content_id = p_content_id and content_version = p_content_version and active;
  if not found then raise exception 'unknown or inactive content'; end if;
  if p_occurred_at > now() + interval '5 minutes' then raise exception 'occurred_at is in the future'; end if;
  if p_occurred_at < now() - interval '24 hours' and p_offline_authorization is null then
    raise exception 'late evidence requires offline authorization';
  end if;
  perform private.rate_limit(v_assignment.id::text,'submit_xp_evidence',2000,interval '1 day');
  v_local_date := private.local_date(p_occurred_at);

  -- Preserve sequence and eligibility ordering while a parent decision is pending.
  -- The reviewed event itself remains idempotently replayable above.
  if exists(select 1 from public.xp_evidence_events
    where assignment_id=v_assignment.id and status='needs_review') then
    raise exception 'earlier evidence awaits parent review' using errcode='40001';
  end if;

  select * into v_assignment from public.device_assignments where id = v_assignment.id for update;
  if v_assignment.status <> 'active' then raise exception 'device revoked' using errcode = '42501'; end if;
  if p_device_sequence <> v_assignment.last_device_sequence + 1 then
    raise exception 'device sequence gap or stale sequence' using errcode = '40001',
      detail = format('expected %s', v_assignment.last_device_sequence + 1);
  end if;

  if p_offline_authorization is not null then
    v_has_authorization := private.consume_offline_authorization(
      v_assignment.id, v_assignment.profile_id, p_offline_authorization, p_attempt_id,
      p_content_id, p_occurred_at);
  end if;

  if v_catalog.content_kind = 'analogy' then
    if p_evidence_kind not in ('analogy_type_correct','analogy_bridge_lock','analogy_discard','analogy_final','analogy_complete') then
      raise exception 'invalid analogy evidence kind';
    end if;
    v_state := private.create_attempt_if_needed(v_assignment, p_attempt_id, p_content_id);
    if v_state.completed then raise exception 'attempt already completed'; end if;
    if p_evidence_kind = 'analogy_type_correct' then
      if v_state.type_awarded then raise exception 'type step already submitted'; end if;
      if p_payload ->> 'group' is distinct from v_catalog.metadata ->> 'foundationGroup' then
        raise exception 'incorrect analogy group';
      end if;
      v_award := case when v_state.mode = 'full' then private.analogy_xp(1, v_catalog.difficulty) else 0 end;
      update private.xp_attempt_state set type_awarded = true where assignment_id = v_assignment.id and attempt_id = p_attempt_id;
    elsif p_evidence_kind = 'analogy_bridge_lock' then
      if v_state.bridge_awarded then raise exception 'bridge step already submitted'; end if;
      v_award := case when v_state.mode = 'full' then private.analogy_xp(2, v_catalog.difficulty)
        when v_state.mode = 'repeat' then 1 else 0 end;
      update private.xp_attempt_state set bridge_awarded = true where assignment_id = v_assignment.id and attempt_id = p_attempt_id;
    elsif p_evidence_kind = 'analogy_discard' then
      v_choice := p_payload ->> 'choice';
      if v_choice is null or v_choice = v_catalog.correct_choice
        or not (coalesce(v_catalog.metadata -> 'choiceIds', '[]'::jsonb) ? v_choice) then
        raise exception 'only a known incorrect choice can earn discard XP';
      end if;
      if v_choice = any(v_state.discarded_choices) then raise exception 'choice already discarded'; end if;
      v_award := case when v_state.mode = 'full' then private.analogy_xp(1, v_catalog.difficulty) else 0 end;
      update private.xp_attempt_state set discarded_choices = array_append(discarded_choices, v_choice)
        where assignment_id = v_assignment.id and attempt_id = p_attempt_id;
    elsif p_evidence_kind = 'analogy_final' then
      if v_state.final_awarded then raise exception 'final already submitted'; end if;
      v_choice := p_payload ->> 'choice';
      if coalesce((p_payload ->> 'blank')::boolean,false) is not true
        and not (coalesce(v_catalog.metadata -> 'choiceIds', '[]'::jsonb) ? v_choice) then
        raise exception 'unknown final choice';
      end if;
      v_correct := coalesce(v_choice = v_catalog.correct_choice,false);
      if not v_correct and coalesce((p_payload ->> 'acknowledged')::boolean, false) is not true then
        raise exception 'incorrect final requires acknowledgement';
      end if;
      v_award := case when v_state.mode = 'full' then private.analogy_xp(case when v_correct then 2 else 1 end, v_catalog.difficulty) else 0 end;
      update private.xp_attempt_state set final_awarded = true, correct = v_correct
        where assignment_id = v_assignment.id and attempt_id = p_attempt_id;
    else
      if not v_state.final_awarded then raise exception 'final evidence required before completion'; end if;
      insert into private.profile_xp_facts(profile_id) values (v_assignment.profile_id) on conflict do nothing;
      select * into v_facts from private.profile_xp_facts where profile_id = v_assignment.profile_id for update;
      v_correct := v_state.correct;
      v_award := case when v_correct and (v_facts.correct_streak + 1) % 5 = 0 then 5 else 0 end;
    end if;
  elsif v_catalog.content_kind = 'vocab' then
    if p_evidence_kind <> 'vocab_answer' then raise exception 'invalid vocab evidence kind'; end if;
    if exists (select 1 from public.xp_evidence_events where profile_id = v_assignment.profile_id and attempt_id = p_attempt_id and evidence_kind = 'vocab_answer') then
      raise exception 'vocab attempt already submitted';
    end if;
    v_choice := p_payload ->> 'choice';
    if not (coalesce(v_catalog.metadata -> 'choiceIds', '[]'::jsonb) ? v_choice) then raise exception 'unknown vocab choice'; end if;
    v_correct := v_choice = v_catalog.correct_choice;
    if v_correct then
      v_award := coalesce((v_catalog.metadata ->> 'xp')::integer, 0);
      insert into private.vocab_xp_facts(profile_id, vocab_id)
        values (v_assignment.profile_id, v_catalog.metadata ->> 'vocabId') on conflict do nothing;
      select * into v_vocab from private.vocab_xp_facts
        where profile_id = v_assignment.profile_id and vocab_id = v_catalog.metadata ->> 'vocabId' for update;
      if v_catalog.metadata ->> 'questionType' = 'context' then
        if not v_vocab.mastery_bonus_awarded and v_vocab.correct_context_count + 1 >= 2 then
          v_award := v_award + 10;
        end if;
      end if;
    end if;
    insert into private.profile_xp_facts(profile_id) values (v_assignment.profile_id) on conflict do nothing;
  end if;

  -- Review controls apply only to terminal events. No profile/completion/mastery
  -- facts are advanced until a reviewed event is accepted by the parent.
  select coalesce(sum(awarded_xp), 0) into v_daily_xp from public.xp_evidence_events
    where profile_id = v_assignment.profile_id and family_local_date = v_local_date and status = 'accepted';
  if p_evidence_kind in ('analogy_complete', 'vocab_answer') then
    select count(*) into v_daily_count from public.xp_evidence_events
      where profile_id = v_assignment.profile_id and received_at >= now() - interval '1 hour'
        and evidence_kind in ('analogy_complete', 'vocab_answer');
    if v_force_review then v_status := 'needs_review';
    elsif v_daily_xp + v_award > 3000 then v_status := 'needs_review'; v_review := 'daily earned XP review threshold';
    elsif v_daily_count + 1 > 200 then v_status := 'needs_review'; v_review := 'hourly completed-attempt review threshold';
    end if;
  end if;

  if v_status='accepted' and p_evidence_kind='analogy_complete' then
    update private.profile_xp_facts set
      completed_analogy_count = completed_analogy_count + 1,
      correct_analogy_count = correct_analogy_count + case when v_correct then 1 else 0 end,
      correct_streak = case when v_correct then correct_streak + 1 else 0 end
    where profile_id = v_assignment.profile_id returning * into v_facts;
    insert into private.analogy_completion_facts(profile_id, content_id, completed_ordinal)
      values (v_assignment.profile_id, p_content_id, v_facts.completed_analogy_count);
    update private.xp_attempt_state set completed = true
      where assignment_id = v_assignment.id and attempt_id = p_attempt_id;
  elsif v_status='accepted' and p_evidence_kind='vocab_answer' then
    if v_correct and v_catalog.metadata ->> 'questionType' = 'context' then
      update private.vocab_xp_facts set
        correct_context_count = correct_context_count + 1,
        mastery_bonus_awarded = mastery_bonus_awarded or (correct_context_count + 1 >= 2)
      where profile_id = v_assignment.profile_id and vocab_id = v_catalog.metadata ->> 'vocabId';
    end if;
    update private.profile_xp_facts set vocab_answer_count = vocab_answer_count + 1
      where profile_id = v_assignment.profile_id;
  end if;

  insert into public.xp_evidence_events(
    event_id, profile_id, assignment_id, attempt_id, device_sequence, evidence_kind,
    content_id, content_version, rule_version, payload, payload_hash, occurred_at,
    family_local_date, status, awarded_xp, review_reason
  ) values (
    p_event_id, v_assignment.profile_id, v_assignment.id, p_attempt_id, p_device_sequence,
    p_evidence_kind, p_content_id, p_content_version, p_rule_version, p_payload, v_hash,
    p_occurred_at, v_local_date, v_status, v_award, v_review
  );
  update public.device_assignments set last_device_sequence = p_device_sequence, last_seen_at = now()
    where id = v_assignment.id;

  if v_status = 'accepted' and v_award > 0 then
    v_ledger := private.apply_ledger(v_assignment.profile_id, 'earned', v_award, v_award,
      p_event_id, 'validated learning evidence', p_event_id, null, null,
      jsonb_build_object('attemptId', p_attempt_id, 'evidenceKind', p_evidence_kind));
  end if;

  -- Daily vocabulary bonus is based on accepted unique answers in Los Angeles time.
  if v_status = 'accepted' and p_evidence_kind = 'vocab_answer' then
    select count(*) + coalesce((select vocab_done from private.daily_progress_facts
      where profile_id=v_assignment.profile_id and family_local_date=v_local_date),0) into v_daily_count from public.xp_evidence_events
      where profile_id = v_assignment.profile_id and family_local_date = v_local_date
        and evidence_kind = 'vocab_answer' and status = 'accepted';
    if v_daily_count >= 20 and not exists (
      select 1 from public.daily_award_claims where profile_id = v_assignment.profile_id
        and family_local_date = v_local_date and award_kind = 'vocab_day_bonus'
    ) then
      v_ledger := private.apply_ledger(v_assignment.profile_id, 'earned', 15, 15,
        gen_random_uuid(), '20 vocabulary answers in family-local day', null, null, null,
        jsonb_build_object('awardKind','vocab_day_bonus','date',v_local_date));
      insert into public.daily_award_claims(profile_id, family_local_date, award_kind, ledger_id)
        values (v_assignment.profile_id, v_local_date, 'vocab_day_bonus', v_ledger.id);
    end if;
  end if;

  if v_status = 'accepted' and p_evidence_kind = 'analogy_complete' then
    select count(*) + coalesce((select analogy_completed from private.daily_progress_facts
      where profile_id=v_assignment.profile_id and family_local_date=v_local_date),0)
      into v_daily_count from public.xp_evidence_events
      where profile_id = v_assignment.profile_id and family_local_date = v_local_date
        and evidence_kind = 'analogy_complete' and status = 'accepted';
    if v_daily_count >= 8 and exists (
      select 1 from public.daily_award_claims where profile_id = v_assignment.profile_id
        and family_local_date = v_local_date and award_kind = 'exit_ticket'
    ) and not exists (
      select 1 from public.daily_award_claims where profile_id = v_assignment.profile_id
        and family_local_date = v_local_date and award_kind = 'analogy_day_bonus'
    ) then
      v_ledger := private.apply_ledger(v_assignment.profile_id, 'earned', 25, 25,
        gen_random_uuid(), 'eight analogies plus exit ticket in family-local day', null, null, null,
        jsonb_build_object('awardKind','analogy_day_bonus','date',v_local_date));
      insert into public.daily_award_claims(profile_id, family_local_date, award_kind, ledger_id)
        values (v_assignment.profile_id, v_local_date, 'analogy_day_bonus', v_ledger.id);
    end if;
  end if;

  return jsonb_build_object('eventId', p_event_id, 'status', v_status, 'awardedXp', v_award,
    'reviewReason', v_review, 'duplicate', false,
    'balance', (select to_jsonb(b) from public.profile_balances b where b.profile_id = v_assignment.profile_id));
end;
$$;

create or replace function public.adjust_xp(
  p_profile_id uuid, p_lifetime_delta bigint, p_available_delta bigint,
  p_reason text, p_idempotency_key uuid
) returns public.xp_ledger
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare v_family uuid; v_ledger public.xp_ledger;
begin
  select family_id into v_family from public.child_profiles where id = p_profile_id;
  perform private.require_parent(v_family, false);
  if p_lifetime_delta < 0 then raise exception 'lifetime XP cannot be reduced by routine adjustment; use reversal'; end if;
  if p_lifetime_delta <> p_available_delta and p_lifetime_delta <> 0 then raise exception 'earned adjustment must affect both balances equally'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'audit reason required'; end if;
  select * into v_ledger from public.xp_ledger
    where profile_id=p_profile_id and idempotency_key=p_idempotency_key;
  if found then return v_ledger; end if;
  v_ledger := private.apply_ledger(p_profile_id, 'parent_adjustment', p_lifetime_delta,
    p_available_delta, p_idempotency_key, p_reason);
  perform private.write_audit(v_family, p_profile_id, 'parent', 'xp_adjusted', 'xp_ledger',
    v_ledger.id::text, p_reason, null, to_jsonb(v_ledger));
  return v_ledger;
end;
$$;

create or replace function public.set_exact_available_xp(
  p_profile_id uuid, p_target_available_xp bigint, p_expected_balance_version bigint,
  p_reason text, p_idempotency_key uuid
) returns public.xp_ledger
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare v_family uuid; v_balance public.profile_balances; v_delta bigint; v_ledger public.xp_ledger;
begin
  select family_id into v_family from public.child_profiles where id = p_profile_id;
  perform private.require_parent(v_family, false);
  if p_target_available_xp < 0 then raise exception 'target cannot be negative'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'audit reason required'; end if;
  select * into v_ledger from public.xp_ledger
    where profile_id=p_profile_id and idempotency_key=p_idempotency_key;
  if found then
    if v_ledger.metadata->>'operation' is distinct from 'set_exact'
      or (v_ledger.metadata->>'target')::bigint is distinct from p_target_available_xp then
      raise exception 'idempotency key reused with different set-exact target' using errcode='23505';
    end if;
    return v_ledger;
  end if;
  select * into v_balance from public.profile_balances where profile_id = p_profile_id for update;
  if not found then raise exception 'balance not found'; end if;
  if v_balance.version <> p_expected_balance_version then
    raise exception 'stale balance version' using errcode='40001';
  end if;
  v_delta := p_target_available_xp - v_balance.available_xp;
  v_ledger := private.apply_ledger(p_profile_id, 'parent_adjustment', greatest(v_delta,0),
    v_delta, p_idempotency_key, p_reason, null, null, null,
    jsonb_build_object('operation','set_exact','target',p_target_available_xp));
  perform private.write_audit(v_family, p_profile_id, 'parent', 'xp_set_exact', 'xp_ledger',
    v_ledger.id::text, p_reason, to_jsonb(v_balance),
    (select to_jsonb(b) from public.profile_balances b where b.profile_id = p_profile_id));
  return v_ledger;
end;
$$;

create or replace function public.reverse_xp_event(
  p_ledger_id uuid, p_reason text, p_idempotency_key uuid
) returns public.xp_ledger
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare v_original public.xp_ledger; v_family uuid; v_result public.xp_ledger;
begin
  select * into v_original from public.xp_ledger where id = p_ledger_id for share;
  if not found or v_original.kind not in ('earned','parent_adjustment') then
    raise exception 'only earned or parent-adjustment events can use generic reversal';
  end if;
  select family_id into v_family from public.child_profiles where id = v_original.profile_id;
  perform private.require_parent(v_family, false);
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'audit reason required'; end if;
  select * into v_result from public.xp_ledger
    where profile_id=v_original.profile_id and idempotency_key=p_idempotency_key;
  if found then return v_result; end if;
  v_result := private.apply_ledger(v_original.profile_id, 'reversal', -v_original.lifetime_delta,
    -v_original.available_delta, p_idempotency_key, p_reason, null, null, v_original.id);
  perform private.write_audit(v_family, v_original.profile_id, 'parent', 'xp_reversed',
    'xp_ledger', v_result.id::text, p_reason, to_jsonb(v_original), to_jsonb(v_result));
  return v_result;
end;
$$;

create or replace function public.award_daily_xp(
  p_profile_id uuid, p_award_kind text, p_idempotency_key uuid, p_reason text default null
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_family uuid; v_date date := private.local_date(now()); v_amount integer;
  v_ledger public.xp_ledger; v_completed integer;
begin
  select family_id into v_family from public.child_profiles where id = p_profile_id;
  perform private.require_parent(v_family, false);
  if p_award_kind <> 'exit_ticket' then raise exception 'parents may directly award only exit_ticket'; end if;
  if exists (select 1 from public.daily_award_claims where profile_id = p_profile_id
    and family_local_date = v_date and award_kind = p_award_kind) then
    return jsonb_build_object('duplicate',true,'date',v_date,
      'balance',(select to_jsonb(b) from public.profile_balances b where b.profile_id=p_profile_id));
  end if;
  v_amount := 20;
  v_ledger := private.apply_ledger(p_profile_id, 'earned', v_amount, v_amount, p_idempotency_key,
    coalesce(nullif(btrim(p_reason),''),'parent-awarded exit ticket'), null, null, null,
    jsonb_build_object('awardKind',p_award_kind,'date',v_date));
  insert into public.daily_award_claims(profile_id, family_local_date, award_kind, ledger_id)
    values (p_profile_id, v_date, p_award_kind, v_ledger.id);
  perform private.write_audit(v_family, p_profile_id, 'parent', 'daily_xp_awarded',
    'daily_award_claims', v_ledger.id::text, p_reason, null, to_jsonb(v_ledger));

  select count(*) + coalesce((select analogy_completed from private.daily_progress_facts
    where profile_id=p_profile_id and family_local_date=v_date),0) into v_completed from public.xp_evidence_events where profile_id = p_profile_id
    and family_local_date = v_date and evidence_kind = 'analogy_complete' and status = 'accepted';
  if v_completed >= 8 and not exists (select 1 from public.daily_award_claims
    where profile_id = p_profile_id and family_local_date = v_date and award_kind = 'analogy_day_bonus') then
    v_ledger := private.apply_ledger(p_profile_id, 'earned', 25, 25, gen_random_uuid(),
      'eight analogies plus exit ticket in family-local day', null, null, null,
      jsonb_build_object('awardKind','analogy_day_bonus','date',v_date));
    insert into public.daily_award_claims(profile_id, family_local_date, award_kind, ledger_id)
      values (p_profile_id, v_date, 'analogy_day_bonus', v_ledger.id);
  end if;
  return jsonb_build_object('duplicate',false,'date',v_date,
    'balance',(select to_jsonb(b) from public.profile_balances b where b.profile_id=p_profile_id));
end;
$$;

revoke all on function public.create_enrollment_invitation(uuid,text),
  public.create_replacement_invitation(uuid,text),
  public.consume_enrollment_invitation(text,text), public.revoke_device(uuid,text,uuid),
  public.issue_offline_attempt_authorizations(integer),
  public.submit_xp_evidence(uuid,uuid,bigint,text,text,integer,integer,jsonb,text,timestamptz,text),
  public.adjust_xp(uuid,bigint,bigint,text,uuid), public.set_exact_available_xp(uuid,bigint,bigint,text,uuid),
  public.reverse_xp_event(uuid,text,uuid), public.award_daily_xp(uuid,text,uuid,text)
  from public, anon;
grant execute on function public.create_enrollment_invitation(uuid,text),
  public.create_replacement_invitation(uuid,text),
  public.consume_enrollment_invitation(text,text), public.revoke_device(uuid,text,uuid),
  public.issue_offline_attempt_authorizations(integer),
  public.submit_xp_evidence(uuid,uuid,bigint,text,text,integer,integer,jsonb,text,timestamptz,text),
  public.adjust_xp(uuid,bigint,bigint,text,uuid), public.set_exact_available_xp(uuid,bigint,bigint,text,uuid),
  public.reverse_xp_event(uuid,text,uuid), public.award_daily_xp(uuid,text,uuid,text)
  to authenticated;

revoke all on function private.write_audit(uuid,uuid,text,text,text,text,text,jsonb,jsonb),
  private.apply_ledger(uuid,public.xp_ledger_kind,bigint,bigint,uuid,text,uuid,uuid,uuid,jsonb),
  private.consume_offline_authorization(uuid,uuid,text,uuid,text,timestamptz), private.local_date(timestamptz),
  private.analogy_xp(integer,integer),
  private.create_attempt_if_needed(public.device_assignments,uuid,text)
  from public, anon, authenticated;
