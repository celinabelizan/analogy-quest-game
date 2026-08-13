-- SSAT Quest secure synchronization, Phase 1: reviewed, idempotent local migration.
-- Detailed analogy/Vocabulary state is deliberately NOT imported. Only protected
-- XP facts needed to avoid duplicate bonuses/repeats are accepted below.

alter table public.daily_award_claims add constraint daily_award_claims_migration_fk
  foreign key (migration_id) references public.migration_sessions(id) on delete restrict;

create or replace function private.valid_migration_candidate(p_candidate jsonb)
returns boolean language sql immutable security invoker set search_path=pg_catalog as $$
 select jsonb_typeof(p_candidate)='object'
  and jsonb_typeof(p_candidate->'lifetimeXp')='number'
  and jsonb_typeof(p_candidate->'availableXp')='number'
  and (p_candidate->>'lifetimeXp')::bigint>=0
  and (p_candidate->>'availableXp')::bigint>=0
  and (p_candidate->>'availableXp')::bigint<=(p_candidate->>'lifetimeXp')::bigint
  and jsonb_typeof(coalesce(p_candidate->'rewards','[]'::jsonb))='array'
  and jsonb_typeof(coalesce(p_candidate->'redemptions','[]'::jsonb))='array'
  and jsonb_typeof(coalesce(p_candidate->'vocabBonusFacts','[]'::jsonb))='array'
  and jsonb_typeof(coalesce(p_candidate->'dailyProgressFacts','[]'::jsonb))='array'
  and jsonb_typeof(coalesce(p_candidate->'overlappingDailyClaims','[]'::jsonb))='array'
$$;

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
 values(p_migration_id,p_family_id,p_profile_id,p_storage_path,p_ciphertext_sha256,true,p_retain_until);
end $$;

create or replace function public.stage_migration_snapshot(
 p_migration_id uuid,p_profile_id uuid,p_source_installation_id text,p_idempotency_key uuid,
 p_source_shared_sha256 text,p_source_profile_sha256 text,p_normalized_candidate jsonb,
 p_encrypted_backup_path text,p_encrypted_backup_sha256 text
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_family uuid; v_existing public.migration_sessions; v_balance public.profile_balances; v_report jsonb;
begin
 select family_id into v_family from public.child_profiles where id=p_profile_id; if not found then raise exception 'profile not found'; end if;
 perform private.require_parent(v_family,false);
 perform private.rate_limit(auth.uid()::text,'stage_migration',10,interval '1 hour');
 if p_source_shared_sha256!~'^[0-9a-f]{64}$' or p_source_profile_sha256!~'^[0-9a-f]{64}$'
   or p_encrypted_backup_sha256!~'^[0-9a-f]{64}$' then raise exception 'invalid SHA-256'; end if;
 if not private.valid_migration_candidate(p_normalized_candidate) then raise exception 'invalid migration candidate'; end if;
 select * into v_existing from public.migration_sessions where id=p_migration_id or (profile_id=p_profile_id and idempotency_key=p_idempotency_key);
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
 perform private.write_audit(v_family,p_profile_id,'parent','migration_staged','migration_sessions',p_migration_id::text,null,null,v_report);
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
  insert into public.reward_items(id,family_id,profile_id,status,authoritative_xp_cost,created_by)
   values(v_reward_id,v_migration.family_id,v_migration.profile_id,'approved',(v_reward->>'xp')::integer,auth.uid());
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
 update public.migration_sessions set status='rolled_back',rolled_back_by=auth.uid(),rolled_back_at=now() where id=p_migration_id;
 v_response:=jsonb_build_object('migrationId',p_migration_id,'status','rolled_back','cloudDataRetained',true,
   'encryptedBackupPath',v_migration.encrypted_backup_path,'message','Stop outbound sync and materialize cloud plus pending outbox into local-only cache. No cloud rows were deleted.');
 perform private.write_audit(v_migration.family_id,v_migration.profile_id,'parent','migration_rolled_back','migration_sessions',p_migration_id::text,p_reason,to_jsonb(v_migration),v_response);
 return v_response;
end;
$$;

revoke all on function private.valid_migration_candidate(jsonb) from public,anon,authenticated;
revoke all on function public.internal_register_migration_backup(uuid,uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.internal_register_migration_backup(uuid,uuid,uuid,text,text,timestamptz) to service_role;
revoke all on function public.stage_migration_snapshot(uuid,uuid,text,uuid,text,text,jsonb,text,text),
 public.confirm_migration(uuid,text,text,boolean),public.rollback_migration(uuid,text) from public,anon;
grant execute on function public.stage_migration_snapshot(uuid,uuid,text,uuid,text,text,jsonb,text,text),
 public.confirm_migration(uuid,text,text,boolean),public.rollback_migration(uuid,text) to authenticated;
