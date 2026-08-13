-- SSAT Quest secure synchronization, Phase 1: narrow projection/settings/image attachment.

create or replace function public.set_reward_visibility(
 p_family_id uuid,p_show_rewards boolean,p_expected_version bigint,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_settings public.family_reward_settings; v_response jsonb; v_payload jsonb:=jsonb_build_object('family',p_family_id,'show',p_show_rewards,'version',p_expected_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('set_reward_visibility',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 perform private.require_parent(p_family_id,false);
 insert into public.family_reward_settings(family_id) values(p_family_id) on conflict do nothing;
 select * into v_settings from public.family_reward_settings where family_id=p_family_id for update;
 if v_settings.version<>p_expected_version then raise exception 'stale reward-settings version' using errcode='40001'; end if;
 update public.family_reward_settings set show_rewards=p_show_rewards,version=version+1,updated_at=now() where family_id=p_family_id;
 v_response:=jsonb_build_object('familyId',p_family_id,'showRewards',p_show_rewards,'version',p_expected_version+1);
 perform private.write_audit(p_family_id,null,'parent','reward_visibility_changed','family_reward_settings',p_family_id::text,null,to_jsonb(v_settings),v_response);
 return private.store_receipt('set_reward_visibility',p_idempotency_key,v_payload,v_response);
end $$;

create or replace function public.attach_reward_image(
 p_revision_id uuid,p_image_asset_id uuid,p_expected_reward_version bigint,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_rev public.reward_revisions; v_item public.reward_items; v_asset public.reward_image_assets; v_response jsonb;
 v_payload jsonb:=jsonb_build_object('revision',p_revision_id,'asset',p_image_asset_id,'version',p_expected_reward_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('attach_reward_image',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_rev from public.reward_revisions where id=p_revision_id for update; if not found then raise exception 'revision not found'; end if;
 select * into v_item from public.reward_items where id=v_rev.reward_id for update;
 perform private.reward_actor_profile(v_item.profile_id);
 if v_item.version<>p_expected_reward_version then raise exception 'stale reward version' using errcode='40001'; end if;
 if v_rev.status<>'pending' then raise exception 'image can attach only to a pending revision'; end if;
 select * into v_asset from public.reward_image_assets where id=p_image_asset_id for update;
 if not found or v_asset.profile_id<>v_item.profile_id or v_asset.reward_id<>v_item.id or v_asset.finalized_at is null then raise exception 'finalized same-reward image not found'; end if;
 if v_asset.revision_id is not null and v_asset.revision_id<>p_revision_id then raise exception 'image already attached elsewhere'; end if;
 update public.reward_image_assets set revision_id=p_revision_id where id=p_image_asset_id;
 update public.reward_revisions set image_asset_id=p_image_asset_id where id=p_revision_id;
 update public.reward_items set version=version+1 where id=v_item.id;
 v_response:=jsonb_build_object('rewardId',v_item.id,'revisionId',p_revision_id,'imageAssetId',p_image_asset_id,'version',p_expected_reward_version+1);
 perform private.write_audit(v_item.family_id,v_item.profile_id,case when private.is_parent_of_family(v_item.family_id) then 'parent' else 'child_device' end,'reward_image_attached','reward_revisions',p_revision_id::text,null,to_jsonb(v_rev),v_response);
 return private.store_receipt('attach_reward_image',p_idempotency_key,v_payload,v_response);
end $$;

create or replace function public.get_phase1_projection(p_profile_id uuid default null)
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,private,public
as $$
declare v_profile uuid; v_family uuid; v_balance jsonb; v_settings jsonb;
begin
 if p_profile_id is null then v_profile:=(private.require_active_assignment()).profile_id;
 else v_profile:=private.reward_actor_profile(p_profile_id); end if;
 select family_id into v_family from public.child_profiles where id=v_profile;
 select to_jsonb(b) into v_balance from public.profile_balances b where b.profile_id=v_profile;
 select to_jsonb(s) into v_settings from public.family_reward_settings s where s.family_id=v_family;
 return jsonb_build_object('schemaVersion',1,'profileId',v_profile,'serverCursor',extract(epoch from clock_timestamp())::text,
  'receivedAt',clock_timestamp(),'balance',coalesce(v_balance,jsonb_build_object('profile_id',v_profile,'lifetime_xp',0,'available_xp',0,'version',0)),
  'rewards',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.reward_items r where r.profile_id=v_profile),'[]'::jsonb),
  'revisions',coalesce((select jsonb_agg(to_jsonb(rr) order by rr.created_at,rr.id) from public.reward_revisions rr where rr.profile_id=v_profile),'[]'::jsonb),
  'activeRewardId',(select reward_id from public.reward_goals where profile_id=v_profile),
  'activeRewardVersion',coalesce((select version from public.reward_goals where profile_id=v_profile),0),
  'rewardVisibility',coalesce((v_settings->>'show_rewards')::boolean,false),
  'redemptions',coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at,x.id) from public.redemption_requests x where x.profile_id=v_profile),'[]'::jsonb));
end $$;

revoke all on function public.set_reward_visibility(uuid,boolean,bigint,uuid),public.attach_reward_image(uuid,uuid,bigint,uuid),public.get_phase1_projection(uuid) from public,anon;
grant execute on function public.set_reward_visibility(uuid,boolean,bigint,uuid),public.attach_reward_image(uuid,uuid,bigint,uuid),public.get_phase1_projection(uuid) to authenticated;
