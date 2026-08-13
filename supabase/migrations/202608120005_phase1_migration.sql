-- SSAT Quest secure synchronization, Phase 1: reviewed, idempotent local migration.
-- Detailed analogy/Vocabulary state is deliberately NOT imported. Only protected
-- XP facts needed to avoid duplicate bonuses/repeats are accepted below.

alter table public.daily_award_claims add constraint daily_award_claims_migration_fk
  foreign key (migration_id) references public.migration_sessions(id) on delete restrict;

create or replace function private.valid_migration_candidate(p_candidate jsonb)
returns boolean language plpgsql immutable security invoker set search_path=pg_catalog as $$
declare v jsonb; v_completed bigint;
begin
 if jsonb_typeof(p_candidate)<>'object' or pg_column_size(p_candidate)>1048576 then return false; end if;
 if jsonb_typeof(p_candidate->'lifetimeXp')<>'number' or jsonb_typeof(p_candidate->'availableXp')<>'number' then return false; end if;
 if (p_candidate->>'lifetimeXp')::bigint not between 0 and 1000000000
   or (p_candidate->>'availableXp')::bigint not between 0 and (p_candidate->>'lifetimeXp')::bigint then return false; end if;
 if jsonb_typeof(p_candidate->'rewards')<>'array' or jsonb_array_length(p_candidate->'rewards')>200
  or jsonb_typeof(p_candidate->'redemptions')<>'array' or jsonb_array_length(p_candidate->'redemptions')>1000
  or jsonb_typeof(p_candidate->'vocabBonusFacts')<>'array' or jsonb_array_length(p_candidate->'vocabBonusFacts')>1000
  or jsonb_typeof(p_candidate->'dailyProgressFacts')<>'array' or jsonb_array_length(p_candidate->'dailyProgressFacts')>3660
  or jsonb_typeof(p_candidate->'overlappingDailyClaims')<>'array' or jsonb_array_length(p_candidate->'overlappingDailyClaims')>10 then return false; end if;
 if jsonb_typeof(p_candidate->'xpFacts')<>'object'
  or jsonb_typeof(p_candidate#>'{xpFacts,analogyLastCompleted}')<>'array'
  or jsonb_array_length(p_candidate#>'{xpFacts,analogyLastCompleted}')>10000
  or jsonb_typeof(p_candidate->'localLearningSummary')<>'object'
  or jsonb_typeof(p_candidate->'showRewards')<>'boolean'
  or not (p_candidate ? 'activeRewardId') then return false; end if;
 if p_candidate->'activeRewardId' <> 'null'::jsonb
  and (jsonb_typeof(p_candidate->'activeRewardId')<>'string'
    or char_length(p_candidate->>'activeRewardId') not between 1 and 200) then return false; end if;
 v_completed:=coalesce((p_candidate#>>'{xpFacts,completedAnalogyCount}')::bigint,0);
 if v_completed<0 or v_completed>10000000 then return false; end if;
 if coalesce((p_candidate#>>'{xpFacts,correctAnalogyCount}')::bigint,-1) not between 0 and v_completed
  or coalesce((p_candidate#>>'{xpFacts,correctStreak}')::integer,-1) not between 0 and v_completed
  or coalesce((p_candidate#>>'{xpFacts,vocabAnswerCount}')::bigint,-1) not between 0 and 100000000 then return false; end if;
 if (select count(*)<>count(distinct value->>'cloudRewardId') or count(*)<>count(distinct value->>'cloudRevisionId') from jsonb_array_elements(p_candidate->'rewards')) then return false; end if;
 for v in select value from jsonb_array_elements(p_candidate->'rewards') loop
  if jsonb_typeof(v)<>'object' or (v->>'cloudRewardId')::uuid is null or (v->>'cloudRevisionId')::uuid is null
   or coalesce(char_length(v->>'legacyId'),0) not between 1 and 200 or coalesce(char_length(v->>'name'),0) not between 1 and 120
   or (v->>'xp')::integer not between 1 and 100000000 then return false; end if;
  if v ? 'legacyPhotoQuarantined' and char_length(v->>'legacyPhotoQuarantined')>2048 then return false; end if;
  if v ? 'archivedImported' and jsonb_typeof(v->'archivedImported')<>'boolean' then return false; end if;
 end loop;
 if p_candidate->>'activeRewardId' is not null and not exists(
   select 1 from jsonb_array_elements(p_candidate->'rewards') r
   where r->>'legacyId'=p_candidate->>'activeRewardId' and coalesce((r->>'archivedImported')::boolean,false)=false
 ) then return false; end if;
 if exists(select 1 from jsonb_array_elements(p_candidate->'redemptions') x
   where not exists(select 1 from jsonb_array_elements(p_candidate->'rewards') r
     where r->>'legacyId'=x->>'rewardId')) then return false; end if;
 for v in select value from jsonb_array_elements(coalesce(p_candidate#>'{xpFacts,analogyLastCompleted}','[]'::jsonb)) loop
  if jsonb_typeof(v)<>'object' or char_length(v->>'contentId') not between 1 and 100
   or (v->>'completedOrdinal')::bigint not between 1 and v_completed then return false; end if;
 end loop;
 for v in select value from jsonb_array_elements(p_candidate->'dailyProgressFacts') loop
  perform (v->>'familyLocalDate')::date;
  if jsonb_typeof(v)<>'object' or (v->>'analogyCompleted')::integer not between 0 and 10000
   or (v->>'vocabDone')::integer not between 0 and 10000 then return false; end if;
 end loop;
 for v in select value from jsonb_array_elements(p_candidate->'redemptions') loop
  perform (v->>'cloudRedemptionId')::uuid; perform (v->>'requestedAt')::timestamptz;
  if jsonb_typeof(v)<>'object' or coalesce(char_length(v->>'rewardId'),0) not between 1 and 200 or coalesce(char_length(v->>'name'),0) not between 1 and 120
   or (v->>'cost')::integer not between 1 and 100000000 or v->>'status' not in ('pending','approved','declined') then return false; end if;
  if v ? 'resolvedAt' then perform (v->>'resolvedAt')::timestamptz; end if;
 end loop;
 for v in select value from jsonb_array_elements(p_candidate->'vocabBonusFacts') loop
  if jsonb_typeof(v)<>'object' or coalesce(char_length(v->>'vocabId'),0) not between 1 and 100
   or (v->>'correctContextCount')::integer not between 0 and 100000
   or jsonb_typeof(v->'masteryBonusAwarded')<>'boolean' then return false; end if;
 end loop;
 for v in select value from jsonb_array_elements(p_candidate->'overlappingDailyClaims') loop
  perform (v->>'familyLocalDate')::date;
  if jsonb_typeof(v)<>'object' or v->>'awardKind' not in ('exit_ticket','analogy_day_bonus','vocab_day_bonus') then return false; end if;
 end loop;
 return true;
exception when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range or datetime_field_overflow then return false;
end $$;

create or replace function public.request_device_migration_capture(p_profile_id uuid,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,private,public as $$
declare v_profile public.child_profiles; v_assignment public.device_assignments; v_existing public.migration_capture_requests;
begin
 select * into v_profile from public.child_profiles where id=p_profile_id; if not found then raise exception 'profile not found'; end if;
 perform private.require_parent(v_profile.family_id,true);
 if v_profile.kind='child' and not exists(select 1 from public.families where id=v_profile.family_id and real_profile_migration_enabled) then
  raise exception 'real-profile migration is disabled by the server release gate' using errcode='42501';
 end if;
 if v_profile.sync_authoritative_at is not null then raise exception 'profile is already cloud authoritative'; end if;
 select * into v_assignment from public.device_assignments where profile_id=p_profile_id and status='active';
 if not found then raise exception 'active child installation required'; end if;
 update public.migration_capture_requests set status='expired' where profile_id=p_profile_id and status='requested' and expires_at<=now();
 select * into v_existing from public.migration_capture_requests where profile_id=p_profile_id and status in ('requested','captured');
 if found then return jsonb_build_object('requestId',v_existing.id,'expiresAt',v_existing.expires_at,'duplicate',true); end if;
 insert into public.migration_capture_requests(id,family_id,profile_id,assignment_id,requested_by,expires_at)
 values(p_request_id,v_profile.family_id,p_profile_id,v_assignment.id,auth.uid(),now()+interval '24 hours');
 perform private.write_audit(v_profile.family_id,p_profile_id,'parent','migration_capture_requested','migration_capture_requests',p_request_id::text,'capture must occur on assigned child installation');
 return jsonb_build_object('requestId',p_request_id,'expiresAt',now()+interval '24 hours','duplicate',false);
end $$;

create or replace function public.acknowledge_migration_backup_export(p_migration_id uuid)
returns void language plpgsql volatile security definer set search_path=pg_catalog,private,public as $$
declare v_assignment public.device_assignments:=private.require_active_assignment();
begin
 update public.migration_capture_requests set backup_exported_at=coalesce(backup_exported_at,now())
 where id=p_migration_id and assignment_id=v_assignment.id and status='captured';
 if not found then raise exception 'captured migration request not found'; end if;
end $$;

create or replace function public.cancel_migration_capture_request(p_request_id uuid,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,private,public as $$
declare v_request public.migration_capture_requests; v_response jsonb;
begin
 select * into v_request from public.migration_capture_requests where id=p_request_id for update;
 if not found then raise exception 'migration capture not found'; end if;
 perform private.require_parent(v_request.family_id,true);
 if char_length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'bounded cancellation reason required'; end if;
 if v_request.status='cancelled' then return jsonb_build_object('requestId',p_request_id,'status','cancelled','duplicate',true); end if;
 if v_request.status not in ('requested','captured') or exists(select 1 from public.migration_sessions where id=p_request_id and status='confirmed') then
  raise exception 'capture cannot be cancelled';
 end if;
 update public.migration_capture_requests set status='cancelled' where id=p_request_id;
 update public.migration_sessions set status='rolled_back',rolled_back_by=auth.uid(),rolled_back_at=now()
  where id=p_request_id and status='staged';
 v_response:=jsonb_build_object('requestId',p_request_id,'profileId',v_request.profile_id,'status','cancelled');
 perform private.write_audit(v_request.family_id,v_request.profile_id,'parent','migration_capture_cancelled',
  'migration_capture_requests',p_request_id::text,p_reason,to_jsonb(v_request),v_response);
 return v_response;
end $$;

create or replace function public.internal_register_migration_backup(
 p_migration_id uuid,p_family_id uuid,p_profile_id uuid,p_storage_path text,p_ciphertext_sha256 text,p_retain_until timestamptz
) returns void language plpgsql volatile security definer
set search_path=pg_catalog,private
as $$
begin
 if current_user not in ('service_role','postgres') then raise exception 'service role required' using errcode='42501'; end if;
 if p_ciphertext_sha256!~'^[0-9a-f]{64}$' or p_retain_until<now()+interval '30 days' then raise exception 'invalid backup attestation'; end if;
 if not exists(select 1 from public.child_profiles where id=p_profile_id and family_id=p_family_id) then raise exception 'profile/family mismatch'; end if;
 insert into private.raw_migration_backups(migration_id,family_id,profile_id,storage_path,ciphertext_sha256,verified_by_server,retain_until)
 values(p_migration_id,p_family_id,p_profile_id,p_storage_path,p_ciphertext_sha256,true,p_retain_until)
 on conflict(migration_id) do update set retain_until=greatest(private.raw_migration_backups.retain_until,excluded.retain_until)
 where private.raw_migration_backups.family_id=excluded.family_id
  and private.raw_migration_backups.profile_id=excluded.profile_id
  and private.raw_migration_backups.storage_path=excluded.storage_path
  and private.raw_migration_backups.ciphertext_sha256=excluded.ciphertext_sha256;
 if not found then raise exception 'migration backup attestation mismatch' using errcode='23505'; end if;
end $$;

create or replace function public.stage_migration_snapshot(
 p_migration_id uuid,p_profile_id uuid,p_source_installation_id text,p_idempotency_key uuid,
 p_source_shared_sha256 text,p_source_profile_sha256 text,p_normalized_candidate jsonb,
 p_encrypted_backup_path text,p_encrypted_backup_sha256 text
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_family uuid; v_existing public.migration_sessions; v_balance public.profile_balances; v_report jsonb;
 v_assignment public.device_assignments:=private.require_active_assignment(); v_request public.migration_capture_requests;
begin
 select family_id into v_family from public.child_profiles where id=p_profile_id; if not found then raise exception 'profile not found'; end if;
 select * into v_request from public.migration_capture_requests where id=p_migration_id for update;
 if not found or v_request.profile_id<>p_profile_id or v_request.assignment_id<>v_assignment.id
  or v_request.status not in ('requested','captured')
  or (v_request.status='requested' and v_request.expires_at<=now()) then raise exception 'active device migration request required' using errcode='42501'; end if;
 if p_source_installation_id<>v_assignment.id::text then raise exception 'source installation mismatch' using errcode='42501'; end if;
 perform private.rate_limit(v_assignment.id::text,'stage_migration',5,interval '1 hour');
 if p_source_shared_sha256!~'^[0-9a-f]{64}$' or p_source_profile_sha256!~'^[0-9a-f]{64}$'
   or p_encrypted_backup_sha256!~'^[0-9a-f]{64}$' then raise exception 'invalid SHA-256'; end if;
 if not private.valid_migration_candidate(p_normalized_candidate) then raise exception 'invalid migration candidate'; end if;
 select * into v_existing from public.migration_sessions where id=p_migration_id or (profile_id=p_profile_id and idempotency_key=p_idempotency_key);
 if v_request.status='captured' and not found then
   raise exception 'captured migration may only replay its existing exact envelope' using errcode='23505';
 end if;
 if found then
   if v_existing.family_id<>v_family or v_existing.profile_id<>p_profile_id
    or v_existing.source_installation_id<>p_source_installation_id
    or v_existing.idempotency_key<>p_idempotency_key
    or v_existing.source_shared_sha256<>p_source_shared_sha256
    or v_existing.source_profile_sha256<>p_source_profile_sha256
    or v_existing.normalized_candidate<>p_normalized_candidate
    or v_existing.encrypted_backup_path<>p_encrypted_backup_path
    or v_existing.encrypted_backup_sha256<>p_encrypted_backup_sha256 then
      raise exception 'migration key reused with different snapshot' using errcode='23505';
   end if;
   return v_existing.comparison_report;
 end if;
 select * into v_balance from public.profile_balances where profile_id=p_profile_id;
 v_report:=jsonb_build_object(
  'local',jsonb_build_object('lifetimeXp',(p_normalized_candidate->>'lifetimeXp')::bigint,'availableXp',(p_normalized_candidate->>'availableXp')::bigint,
    'rewardCount',jsonb_array_length(coalesce(p_normalized_candidate->'rewards','[]'::jsonb)),
    'rewardDetails',coalesce(p_normalized_candidate->'rewards','[]'::jsonb),
    'redemptionCount',jsonb_array_length(coalesce(p_normalized_candidate->'redemptions','[]'::jsonb)),
    'redemptionDetails',coalesce(p_normalized_candidate->'redemptions','[]'::jsonb),
    'learningSummary',coalesce(p_normalized_candidate->'localLearningSummary','{}'::jsonb)),
  'cloud',jsonb_build_object('lifetimeXp',coalesce(v_balance.lifetime_xp,0),'availableXp',coalesce(v_balance.available_xp,0),
    'ledgerCount',(select count(*) from public.xp_ledger where profile_id=p_profile_id),
    'rewardCount',(select count(*) from public.reward_items where profile_id=p_profile_id),
    'redemptionCount',(select count(*) from public.redemption_requests where profile_id=p_profile_id),
    'learningState','Phase 1 local-only; detailed analogy and Vocabulary V1 state is never imported'),
  'requiresExplicitConfirmation',true,'sourceSharedSha256',p_source_shared_sha256,'sourceProfileSha256',p_source_profile_sha256);
 insert into public.migration_sessions(id,family_id,profile_id,source_installation_id,idempotency_key,
  source_shared_sha256,source_profile_sha256,normalized_candidate,encrypted_backup_path,encrypted_backup_sha256,
  comparison_report,staged_by)
 values(p_migration_id,v_family,p_profile_id,p_source_installation_id,p_idempotency_key,
  p_source_shared_sha256,p_source_profile_sha256,p_normalized_candidate,p_encrypted_backup_path,
  p_encrypted_backup_sha256,v_report,auth.uid());
 -- The service-only upload function creates the verified backup marker. A direct
 -- browser RPC cannot attest that an object exists.
 if not exists(select 1 from private.raw_migration_backups where migration_id=p_migration_id
   and family_id=v_family and profile_id=p_profile_id
   and storage_path=p_encrypted_backup_path and ciphertext_sha256=p_encrypted_backup_sha256
   and verified_by_server and retain_until>=now()+interval '30 days') then
   raise exception 'server-verified encrypted backup required before staging';
 end if;
 perform private.write_audit(v_family,p_profile_id,'child_device','migration_staged','migration_sessions',p_migration_id::text,null,null,v_report);
 update public.migration_capture_requests set status='captured',captured_at=now() where id=p_migration_id;
 return v_report;
end;
$$;

create or replace function public.confirm_migration(
 p_migration_id uuid,p_source_shared_sha256 text,p_source_profile_sha256 text,
 p_confirm_cloud_authoritative boolean
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare
 v_migration public.migration_sessions; v_candidate jsonb; v_ledger public.xp_ledger;
 v_reward jsonb; v_redemption jsonb; v_fact jsonb; v_claim jsonb; v_reward_id uuid; v_revision_id uuid;
 v_balance public.profile_balances; v_report jsonb;
begin
 select * into v_migration from public.migration_sessions where id=p_migration_id for update;
 if not found then raise exception 'migration not found'; end if;
 perform private.require_parent(v_migration.family_id,true);
 if v_migration.status='confirmed' then return v_migration.comparison_report; end if;
 if v_migration.status<>'staged' then raise exception 'migration is not staged'; end if;
 if exists(select 1 from public.child_profiles p join public.families f on f.id=p.family_id
   where p.id=v_migration.profile_id and p.kind='child' and not f.real_profile_migration_enabled) then
   raise exception 'real-profile migration is disabled by the server release gate' using errcode='42501';
 end if;
 if not p_confirm_cloud_authoritative then raise exception 'explicit cloud-authoritative confirmation required'; end if;
 if v_migration.source_shared_sha256<>p_source_shared_sha256 or v_migration.source_profile_sha256<>p_source_profile_sha256 then raise exception 'source hashes changed'; end if;
 if not exists(select 1 from private.raw_migration_backups where migration_id=v_migration.id
   and family_id=v_migration.family_id and profile_id=v_migration.profile_id
   and verified_by_server and retain_until>=now()+interval '30 days') then raise exception 'verified 30-day backup retention required'; end if;
 if not exists(select 1 from public.migration_capture_requests where id=v_migration.id
  and status='captured' and backup_exported_at is not null) then raise exception 'child-device backup export acknowledgment required'; end if;
 if exists(select 1 from public.xp_ledger where profile_id=v_migration.profile_id)
   or exists(select 1 from public.reward_items where profile_id=v_migration.profile_id)
   or exists(select 1 from public.redemption_requests where profile_id=v_migration.profile_id) then
   raise exception 'cloud profile is not empty; resolve comparison instead of first-device-wins';
 end if;
 v_candidate:=v_migration.normalized_candidate;
 -- One opening event exactly represents the observed snapshot (e.g. 200, never 400).
 v_ledger:=private.apply_ledger(v_migration.profile_id,'migration_credit',
   (v_candidate->>'lifetimeXp')::bigint,(v_candidate->>'availableXp')::bigint,
   v_migration.idempotency_key,'confirmed local Phase-1 opening balance',null,null,null,
   jsonb_build_object('migrationId',v_migration.id,'sourceProfileSha256',v_migration.source_profile_sha256));

 insert into private.profile_xp_facts(profile_id,completed_analogy_count,correct_analogy_count,correct_streak,vocab_answer_count)
 values(v_migration.profile_id,
  coalesce((v_candidate#>>'{xpFacts,completedAnalogyCount}')::bigint,0),
  coalesce((v_candidate#>>'{xpFacts,correctAnalogyCount}')::bigint,0),
  coalesce((v_candidate#>>'{xpFacts,correctStreak}')::integer,0),
  coalesce((v_candidate#>>'{xpFacts,vocabAnswerCount}')::bigint,0))
 on conflict(profile_id) do update set
  completed_analogy_count=excluded.completed_analogy_count,
  correct_analogy_count=excluded.correct_analogy_count,
  correct_streak=excluded.correct_streak,vocab_answer_count=excluded.vocab_answer_count;
 for v_fact in select value from jsonb_array_elements(coalesce(v_candidate#>'{xpFacts,analogyLastCompleted}','[]'::jsonb)) loop
  if (v_fact->>'completedOrdinal')::bigint>0 then
   insert into private.analogy_completion_facts(profile_id,content_id,completed_ordinal)
   values(v_migration.profile_id,v_fact->>'contentId',(v_fact->>'completedOrdinal')::bigint) on conflict do nothing;
  end if;
 end loop;
 for v_fact in select value from jsonb_array_elements(coalesce(v_candidate->'vocabBonusFacts','[]'::jsonb)) loop
  insert into private.vocab_xp_facts(profile_id,vocab_id,correct_context_count,mastery_bonus_awarded)
  values(v_migration.profile_id,v_fact->>'vocabId',greatest(coalesce((v_fact->>'correctContextCount')::integer,0),0),
    coalesce((v_fact->>'masteryBonusAwarded')::boolean,false))
  on conflict(profile_id,vocab_id) do update set correct_context_count=excluded.correct_context_count,
    mastery_bonus_awarded=excluded.mastery_bonus_awarded;
 end loop;
 for v_fact in select value from jsonb_array_elements(coalesce(v_candidate->'dailyProgressFacts','[]'::jsonb)) loop
  insert into private.daily_progress_facts(profile_id,family_local_date,analogy_completed,vocab_done,migration_id)
  values(v_migration.profile_id,(v_fact->>'familyLocalDate')::date,
    greatest(coalesce((v_fact->>'analogyCompleted')::integer,0),0),
    greatest(coalesce((v_fact->>'vocabDone')::integer,0),0),v_migration.id)
  on conflict(profile_id,family_local_date) do update set
    analogy_completed=excluded.analogy_completed,vocab_done=excluded.vocab_done,migration_id=excluded.migration_id;
 end loop;
 -- Preserved utc-v1 zero-delta claims block duplicate cutover-day bonuses.
 for v_claim in select value from jsonb_array_elements(coalesce(v_candidate->'overlappingDailyClaims','[]'::jsonb)) loop
  if v_claim->>'awardKind' in ('exit_ticket','analogy_day_bonus','vocab_day_bonus') then
   insert into public.daily_award_claims(profile_id,family_local_date,award_kind,calendar_scheme,
     preserved_zero_delta,migration_id)
   values(v_migration.profile_id,(v_claim->>'familyLocalDate')::date,v_claim->>'awardKind','utc-v1',true,v_migration.id)
   on conflict(profile_id,family_local_date,award_kind) do nothing;
  end if;
 end loop;

 for v_reward in select value from jsonb_array_elements(coalesce(v_candidate->'rewards','[]'::jsonb)) loop
  v_reward_id:=(v_reward->>'cloudRewardId')::uuid; v_revision_id:=(v_reward->>'cloudRevisionId')::uuid;
  if coalesce((v_reward->>'xp')::integer,0)<=0 then raise exception 'legacy reward cost must be positive'; end if;
  insert into public.reward_items(id,family_id,profile_id,status,authoritative_xp_cost,created_by,archived_at)
   values(v_reward_id,v_migration.family_id,v_migration.profile_id,
    case when coalesce((v_reward->>'archivedImported')::boolean,false) then 'archived'::public.reward_item_status else 'approved'::public.reward_item_status end,
    (v_reward->>'xp')::integer,auth.uid(),
    case when coalesce((v_reward->>'archivedImported')::boolean,false) then now() else null end);
  insert into public.reward_revisions(id,reward_id,profile_id,revision_number,status,name,proposed_by,reviewed_by,reviewed_at)
   values(v_revision_id,v_reward_id,v_migration.profile_id,1,'approved',v_reward->>'name',auth.uid(),auth.uid(),now());
  update public.reward_items set approved_revision_id=v_revision_id where id=v_reward_id;
 end loop;
 if v_candidate->>'activeRewardId' is not null then
  select (r->>'cloudRewardId')::uuid into v_reward_id from jsonb_array_elements(coalesce(v_candidate->'rewards','[]'::jsonb)) r
   where r->>'legacyId'=v_candidate->>'activeRewardId';
  if v_reward_id is not null then
   insert into public.reward_goals(profile_id,reward_id,version,updated_by,updated_at)
    values(v_migration.profile_id,v_reward_id,1,auth.uid(),now())
    on conflict(profile_id) do update set reward_id=excluded.reward_id,version=public.reward_goals.version+1,updated_by=auth.uid(),updated_at=now();
  end if;
 end if;
 for v_redemption in select value from jsonb_array_elements(coalesce(v_candidate->'redemptions','[]'::jsonb)) loop
  select (r->>'cloudRewardId')::uuid,(r->>'cloudRevisionId')::uuid into v_reward_id,v_revision_id
   from jsonb_array_elements(coalesce(v_candidate->'rewards','[]'::jsonb)) r where r->>'legacyId'=v_redemption->>'rewardId';
  if v_reward_id is not null then
   insert into public.redemption_requests(id,family_id,profile_id,reward_id,reward_revision_id,reward_name_snapshot,
    xp_cost_snapshot,status,requested_by,requested_at,resolved_by,resolved_at,resolution_note)
   values((v_redemption->>'cloudRedemptionId')::uuid,v_migration.family_id,v_migration.profile_id,v_reward_id,v_revision_id,
    v_redemption->>'name',(v_redemption->>'cost')::integer,
    case v_redemption->>'status' when 'approved' then 'approved'::public.redemption_status when 'declined' then 'declined'::public.redemption_status else 'pending'::public.redemption_status end,
    auth.uid(),(v_redemption->>'requestedAt')::timestamptz,
    case when v_redemption->>'status' in ('approved','declined') then auth.uid() else null end,
    nullif(v_redemption->>'resolvedAt','')::timestamptz,'Imported history; XP already reflected in opening balance');
  end if;
 end loop;
 insert into public.family_reward_settings(family_id,show_rewards) values(v_migration.family_id,coalesce((v_candidate->>'showRewards')::boolean,false))
  on conflict(family_id) do update set show_rewards=excluded.show_rewards,version=public.family_reward_settings.version+1,updated_at=now();
 update public.migration_sessions set status='confirmed',confirmed_by=auth.uid(),confirmed_at=now() where id=v_migration.id;
 update public.migration_capture_requests set status='cancelled'
  where id=v_migration.id and status='captured';
 update public.child_profiles set sync_authoritative_at=now(),sync_authoritative_migration_id=v_migration.id
  where id=v_migration.profile_id and sync_authoritative_at is null;
 select * into v_balance from public.profile_balances where profile_id=v_migration.profile_id;
 v_report:=v_migration.comparison_report||jsonb_build_object('confirmed',true,'ledgerLifetimeXp',v_balance.lifetime_xp,
  'ledgerAvailableXp',v_balance.available_xp,'openingLedgerId',v_ledger.id,'confirmedAt',now());
 update public.migration_sessions set comparison_report=v_report where id=v_migration.id;
 perform private.write_audit(v_migration.family_id,v_migration.profile_id,'parent','migration_confirmed','migration_sessions',v_migration.id::text,
  'explicit cloud-authoritative confirmation',to_jsonb(v_migration),v_report);
 return v_report;
end;
$$;

create or replace function public.rollback_migration(p_migration_id uuid,p_reason text)
returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_migration public.migration_sessions; v_response jsonb;
begin
 select * into v_migration from public.migration_sessions where id=p_migration_id for update;
 if not found then raise exception 'migration not found'; end if;
 perform private.require_parent(v_migration.family_id,true);
 if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'rollback reason required'; end if;
 if v_migration.status='rolled_back' then return jsonb_build_object('migrationId',p_migration_id,'status','rolled_back'); end if;
 if v_migration.status='rollback_pending' then return jsonb_build_object('migrationId',p_migration_id,'status','rollback_pending'); end if;
 if v_migration.status='staged' then
  update public.migration_sessions set status='rolled_back',rolled_back_by=auth.uid(),rolled_back_at=now()
   where id=p_migration_id;
  update public.migration_capture_requests set status='cancelled' where id=p_migration_id and status='captured';
  v_response:=jsonb_build_object('migrationId',p_migration_id,'status','rolled_back','cloudWasAuthoritative',false);
  perform private.write_audit(v_migration.family_id,v_migration.profile_id,'parent','migration_staging_cancelled',
   'migration_sessions',p_migration_id::text,p_reason,to_jsonb(v_migration),v_response);
  return v_response;
 end if;
 if v_migration.status<>'confirmed' then raise exception 'only a confirmed migration can roll back'; end if;
 update public.migration_sessions set status='rollback_pending',rolled_back_by=auth.uid() where id=p_migration_id;
 v_response:=jsonb_build_object('migrationId',p_migration_id,'status','rollback_pending','cloudDataRetained',true,
   'message','Assigned child must first materialize the final cloud projection and pending work locally.');
 perform private.write_audit(v_migration.family_id,v_migration.profile_id,'parent','migration_rollback_requested','migration_sessions',p_migration_id::text,p_reason,to_jsonb(v_migration),v_response);
 return v_response;
end;
$$;

create or replace function public.complete_migration_rollback(p_migration_id uuid,p_materialized_sha256 text)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,private,public as $$
declare v_assignment public.device_assignments:=private.require_active_assignment(); v_migration public.migration_sessions;
begin
 if p_materialized_sha256!~'^[0-9a-f]{64}$' then raise exception 'materialized snapshot hash required'; end if;
 select * into v_migration from public.migration_sessions where id=p_migration_id for update;
 if not found or v_migration.profile_id<>v_assignment.profile_id then raise exception 'rollback request not found'; end if;
 if v_migration.status='rolled_back' then return jsonb_build_object('migrationId',p_migration_id,'status','rolled_back','duplicate',true); end if;
 if v_migration.status<>'rollback_pending' then raise exception 'rollback request not found'; end if;
 update public.migration_sessions set status='rolled_back',rolled_back_at=now(),comparison_report=comparison_report||jsonb_build_object('rollbackMaterializedSha256',p_materialized_sha256) where id=p_migration_id;
 update public.child_profiles set sync_authoritative_at=null,sync_authoritative_migration_id=null where id=v_assignment.profile_id;
 perform private.write_audit(v_migration.family_id,v_migration.profile_id,'child_device','migration_rollback_materialized','migration_sessions',p_migration_id::text,'local cache includes final cloud projection',null,jsonb_build_object('sha256',p_materialized_sha256));
 return jsonb_build_object('migrationId',p_migration_id,'status','rolled_back');
end $$;

revoke all on function private.valid_migration_candidate(jsonb) from public,anon,authenticated;
revoke all on function public.internal_register_migration_backup(uuid,uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.internal_register_migration_backup(uuid,uuid,uuid,text,text,timestamptz) to service_role;
revoke all on function public.stage_migration_snapshot(uuid,uuid,text,uuid,text,text,jsonb,text,text),
 public.request_device_migration_capture(uuid,uuid),public.acknowledge_migration_backup_export(uuid),
 public.cancel_migration_capture_request(uuid,text),
 public.confirm_migration(uuid,text,text,boolean),public.rollback_migration(uuid,text),public.complete_migration_rollback(uuid,text) from public,anon;
grant execute on function public.stage_migration_snapshot(uuid,uuid,text,uuid,text,text,jsonb,text,text),
 public.request_device_migration_capture(uuid,uuid),public.acknowledge_migration_backup_export(uuid),
 public.cancel_migration_capture_request(uuid,text),
 public.confirm_migration(uuid,text,text,boolean),public.rollback_migration(uuid,text),public.complete_migration_rollback(uuid,text) to authenticated;
