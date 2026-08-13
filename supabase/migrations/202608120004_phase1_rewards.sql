-- SSAT Quest secure synchronization, Phase 1: wishlist, approval, goals, redemption.

create or replace function private.reward_actor_profile(p_requested_profile_id uuid)
returns uuid
language plpgsql stable security definer
set search_path = pg_catalog, private, public
as $$
declare v_assignment public.device_assignments; v_family uuid;
begin
  begin
    v_assignment := private.require_active_assignment();
    if p_requested_profile_id is not null and p_requested_profile_id <> v_assignment.profile_id then
      raise exception 'child profile mismatch' using errcode = '42501';
    end if;
    if not exists(select 1 from public.child_profiles where id=v_assignment.profile_id
      and sync_authoritative_at is not null) then
      raise exception 'profile migration is not confirmed' using errcode='42501';
    end if;
    return v_assignment.profile_id;
  exception when insufficient_privilege then null;
  end;
  select family_id into v_family from public.child_profiles where id = p_requested_profile_id;
  perform private.require_parent(v_family, false);
  perform private.require_profile_cloud_authoritative(p_requested_profile_id);
  return p_requested_profile_id;
end;
$$;

create or replace function private.store_receipt(
  p_operation text, p_key uuid, p_payload jsonb, p_response jsonb
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, private, extensions
as $$
declare v_uid uuid := auth.uid(); v_hash text; v_prior private.idempotency_receipts;
begin
  if v_uid is null or p_key is null then raise exception 'identity and idempotency key required'; end if;
  v_hash := encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  select * into v_prior from private.idempotency_receipts
    where actor_user_id=v_uid and operation=p_operation and idempotency_key=p_key;
  if found then
    if v_prior.payload_hash <> v_hash then raise exception 'idempotency key reused with different payload' using errcode='23505'; end if;
    return v_prior.response;
  end if;
  insert into private.idempotency_receipts(actor_user_id,operation,idempotency_key,payload_hash,response)
    values(v_uid,p_operation,p_key,v_hash,p_response);
  return p_response;
end;
$$;

create or replace function private.prior_receipt(p_operation text,p_key uuid,p_payload jsonb)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, private, extensions
as $$
declare v_prior private.idempotency_receipts; v_hash text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  v_hash := encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
  select * into v_prior from private.idempotency_receipts where actor_user_id=auth.uid()
    and operation=p_operation and idempotency_key=p_key;
  if not found then return null; end if;
  if v_prior.payload_hash<>v_hash then raise exception 'idempotency key reused with different payload' using errcode='23505'; end if;
  return v_prior.response;
end;
$$;

create or replace function public.submit_reward_proposal(
  p_reward_id uuid, p_revision_id uuid, p_profile_id uuid, p_name text,
  p_product_url text, p_estimated_price_cents integer, p_image_asset_id uuid,
  p_idempotency_key uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_profile uuid; v_family uuid; v_uid uuid:=auth.uid(); v_response jsonb; v_prior jsonb;
  v_payload jsonb:=jsonb_build_object('reward',p_reward_id,'revision',p_revision_id,'profile',p_profile_id,
    'name',p_name,'url',p_product_url,'price',p_estimated_price_cents,'image',p_image_asset_id);
begin
  v_prior:=private.prior_receipt('submit_reward_proposal',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
  v_profile:=private.reward_actor_profile(p_profile_id);
  select family_id into v_family from public.child_profiles where id=v_profile and archived_at is null;
  perform private.rate_limit(v_uid::text,'reward_proposal',20,interval '1 hour');
  if p_reward_id is null or p_revision_id is null then raise exception 'stable reward and revision IDs required'; end if;
  if not private.safe_product_url(nullif(btrim(p_product_url),'')) then raise exception 'unsafe product URL'; end if;
  if p_image_asset_id is not null and not exists(select 1 from public.reward_image_assets
    where id=p_image_asset_id and profile_id=v_profile and reward_id=p_reward_id
      and revision_id is null and finalized_at is not null) then
    raise exception 'image is not an unattached finalized asset for this reward';
  end if;
  insert into public.reward_items(id,family_id,profile_id,created_by) values(p_reward_id,v_family,v_profile,v_uid);
  insert into public.reward_revisions(id,reward_id,profile_id,revision_number,name,product_url,
    estimated_price_cents,image_asset_id,proposed_by)
  values(p_revision_id,p_reward_id,v_profile,1,btrim(p_name),nullif(btrim(p_product_url),''),
    p_estimated_price_cents,p_image_asset_id,v_uid);
  if p_image_asset_id is not null then update public.reward_image_assets set revision_id=p_revision_id where id=p_image_asset_id; end if;
  v_response:=jsonb_build_object('rewardId',p_reward_id,'revisionId',p_revision_id,'status','pending');
  perform private.write_audit(v_family,v_profile,case when private.is_parent_of_family(v_family) then 'parent' else 'child_device' end,
    'reward_proposed','reward_items',p_reward_id::text,null,null,v_response);
  return private.store_receipt('submit_reward_proposal',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.submit_reward_revision(
  p_reward_id uuid, p_revision_id uuid, p_expected_reward_version bigint,
  p_name text, p_product_url text, p_estimated_price_cents integer,
  p_image_asset_id uuid, p_idempotency_key uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, private, public
as $$
declare
 v_item public.reward_items; v_profile uuid; v_number integer; v_uid uuid:=auth.uid(); v_response jsonb; v_prior jsonb;
 v_image_asset_id uuid;
 v_pending public.reward_revisions;
 v_payload jsonb:=jsonb_build_object('reward',p_reward_id,'revision',p_revision_id,'version',p_expected_reward_version,
  'name',p_name,'url',p_product_url,'price',p_estimated_price_cents,'image',p_image_asset_id);
begin
 v_prior:=private.prior_receipt('submit_reward_revision',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_item from public.reward_items where id=p_reward_id for update; if not found then raise exception 'reward not found'; end if;
 v_profile:=private.reward_actor_profile(v_item.profile_id);
 if v_item.status in ('redeemed','archived') then raise exception 'reward cannot be edited'; end if;
 perform private.rate_limit(v_uid::text,'reward_revision',20,interval '1 hour');
 if not private.safe_product_url(nullif(btrim(p_product_url),'')) then raise exception 'unsafe product URL'; end if;
 if p_image_asset_id is not null and not exists(select 1 from public.reward_image_assets
   where id=p_image_asset_id and profile_id=v_profile and reward_id=p_reward_id
     and revision_id is null and finalized_at is not null) then
   raise exception 'image is not an unattached finalized asset for this reward';
 end if;
 select * into v_pending from public.reward_revisions
   where reward_id=p_reward_id and status='pending' for update;
 if v_item.version<>p_expected_reward_version and not (
   v_pending.id is not null and v_pending.proposed_by=v_uid
   and not private.is_parent_of_family(v_item.family_id)
 ) then raise exception 'stale reward version' using errcode='40001'; end if;
 if v_pending.id is not null then
   if v_pending.proposed_by<>v_uid or private.is_parent_of_family(v_item.family_id) then
     raise exception 'pending revision belongs to another actor' using errcode='42501';
   end if;
   update public.reward_revisions set status='withdrawn',reviewed_at=now(),
     review_note='Superseded by a newer child revision' where id=v_pending.id;
 end if;
 v_image_asset_id:=p_image_asset_id;
 if v_image_asset_id is null then
  v_image_asset_id:=coalesce(v_pending.image_asset_id,
    (select image_asset_id from public.reward_revisions where id=v_item.approved_revision_id));
 end if;
 select coalesce(max(revision_number),0)+1 into v_number from public.reward_revisions where reward_id=p_reward_id;
 insert into public.reward_revisions(id,reward_id,profile_id,revision_number,name,product_url,estimated_price_cents,image_asset_id,proposed_by)
 values(p_revision_id,p_reward_id,v_profile,v_number,btrim(p_name),nullif(btrim(p_product_url),''),p_estimated_price_cents,v_image_asset_id,v_uid);
 update public.reward_items set version=version+1 where id=p_reward_id;
 if p_image_asset_id is not null then update public.reward_image_assets set revision_id=p_revision_id where id=p_image_asset_id; end if;
 v_response:=jsonb_build_object('rewardId',p_reward_id,'revisionId',p_revision_id,'revisionNumber',v_number,'status','pending','version',v_item.version+1);
 perform private.write_audit(v_item.family_id,v_profile,case when private.is_parent_of_family(v_item.family_id) then 'parent' else 'child_device' end,
   case when v_pending.id is null then 'reward_revision_submitted' else 'reward_revision_replaced' end,
   'reward_revisions',p_revision_id::text,null,
   case when v_pending.id is null then null else to_jsonb(v_pending) end,v_response);
 return private.store_receipt('submit_reward_revision',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.withdraw_reward_revision(
  p_revision_id uuid,p_expected_reward_version bigint,p_idempotency_key uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_rev public.reward_revisions; v_item public.reward_items; v_assignment public.device_assignments:=private.require_active_assignment(); v_response jsonb; v_payload jsonb:=jsonb_build_object('revision',p_revision_id,'version',p_expected_reward_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('withdraw_reward_revision',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_rev from public.reward_revisions where id=p_revision_id for update; if not found or v_rev.profile_id<>v_assignment.profile_id then raise exception 'revision not found' using errcode='42501'; end if;
 perform private.require_profile_cloud_authoritative(v_assignment.profile_id);
 select * into v_item from public.reward_items where id=v_rev.reward_id for update;
 if p_expected_reward_version>v_item.version then raise exception 'stale reward version' using errcode='40001'; end if;
 if v_rev.status<>'pending' or v_rev.proposed_by<>auth.uid() then raise exception 'only the child who proposed a pending revision may withdraw it' using errcode='42501'; end if;
 update public.reward_revisions set status='withdrawn' where id=p_revision_id;
 update public.reward_items set status=case when approved_revision_id is null then 'declined' else status end,version=version+1 where id=v_item.id;
 v_response:=jsonb_build_object('revisionId',p_revision_id,'status','withdrawn','version',v_item.version+1);
 perform private.write_audit(v_item.family_id,v_item.profile_id,'child_device','reward_revision_withdrawn','reward_revisions',p_revision_id::text,null,to_jsonb(v_rev),v_response);
 return private.store_receipt('withdraw_reward_revision',p_idempotency_key,v_payload,v_response);
end;
$$;

-- A parent edit is one audited, idempotent transaction. It never exposes an
-- intermediate pending revision and preserves the currently approved image when
-- no replacement asset is supplied.
create or replace function public.parent_edit_reward(
 p_reward_id uuid,p_revision_id uuid,p_expected_reward_version bigint,
 p_name text,p_product_url text,p_estimated_price_cents integer,p_image_asset_id uuid,
 p_authoritative_xp_cost integer,p_is_reusable boolean,p_reason text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_item public.reward_items; v_old public.reward_revisions; v_asset public.reward_image_assets;
 v_number integer; v_response jsonb; v_prior jsonb;
 v_payload jsonb:=jsonb_build_object('reward',p_reward_id,'revision',p_revision_id,
  'version',p_expected_reward_version,'name',p_name,'url',p_product_url,
  'price',p_estimated_price_cents,'image',p_image_asset_id,'cost',p_authoritative_xp_cost,
  'reusable',p_is_reusable,'reason',p_reason);
begin
 v_prior:=private.prior_receipt('parent_edit_reward',p_idempotency_key,v_payload);
 if v_prior is not null then return v_prior; end if;
 select * into v_item from public.reward_items where id=p_reward_id for update;
 if not found then raise exception 'reward not found'; end if;
 perform private.require_profile_cloud_authoritative(v_item.profile_id);
 perform private.require_parent(v_item.family_id,true);
 if v_item.version<>p_expected_reward_version then raise exception 'stale reward version' using errcode='40001'; end if;
 if v_item.status<>'approved' or v_item.archived_at is not null then raise exception 'only an active approved reward can be edited'; end if;
 if p_revision_id is null then raise exception 'stable revision ID required'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'bounded reward name required'; end if;
 if not private.safe_product_url(nullif(btrim(p_product_url),'')) then raise exception 'unsafe product URL'; end if;
 if p_estimated_price_cents is not null and p_estimated_price_cents not between 0 and 10000000 then raise exception 'invalid estimated price'; end if;
 if coalesce(p_authoritative_xp_cost,0)<=0 then raise exception 'positive authoritative XP cost required'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'bounded audit reason required'; end if;
 if exists(select 1 from public.reward_revisions where reward_id=p_reward_id and status='pending') then
   raise exception 'review or decline the pending child revision before editing';
 end if;
 select * into v_old from public.reward_revisions where id=v_item.approved_revision_id;
 if p_image_asset_id is not null then
   select * into v_asset from public.reward_image_assets where id=p_image_asset_id for update;
   if not found or v_asset.family_id<>v_item.family_id or v_asset.profile_id<>v_item.profile_id
      or v_asset.reward_id<>v_item.id or v_asset.finalized_at is null
      or (v_asset.revision_id is not null and v_asset.revision_id<>p_revision_id) then
     raise exception 'finalized same-reward image not found';
   end if;
 end if;
 select coalesce(max(revision_number),0)+1 into v_number from public.reward_revisions where reward_id=p_reward_id;
 insert into public.reward_revisions(id,reward_id,profile_id,revision_number,status,name,product_url,
   estimated_price_cents,image_asset_id,proposed_by,reviewed_by,review_note,reviewed_at)
 values(p_revision_id,p_reward_id,v_item.profile_id,v_number,'approved',btrim(p_name),
   nullif(btrim(p_product_url),''),p_estimated_price_cents,
   coalesce(p_image_asset_id,v_old.image_asset_id),auth.uid(),auth.uid(),btrim(p_reason),now());
 if p_image_asset_id is not null then
   update public.reward_image_assets set revision_id=p_revision_id where id=p_image_asset_id;
 end if;
 update public.reward_items set approved_revision_id=p_revision_id,
   authoritative_xp_cost=p_authoritative_xp_cost,is_reusable=p_is_reusable,version=version+1
   where id=p_reward_id;
 v_response:=jsonb_build_object('rewardId',p_reward_id,'revisionId',p_revision_id,
   'status','approved','version',p_expected_reward_version+1,'imageAssetId',
   coalesce(p_image_asset_id,v_old.image_asset_id));
 perform private.write_audit(v_item.family_id,v_item.profile_id,'parent','reward_edited',
   'reward_items',p_reward_id::text,p_reason,
   jsonb_build_object('item',to_jsonb(v_item),'approvedRevision',to_jsonb(v_old)),v_response);
 return private.store_receipt('parent_edit_reward',p_idempotency_key,v_payload,v_response);
end $$;

create or replace function public.review_reward_revision(
 p_revision_id uuid,p_decision text,p_final_name text,p_final_product_url text,
 p_final_estimated_price_cents integer,p_authoritative_xp_cost integer,p_is_reusable boolean,
 p_review_note text,p_expected_reward_version bigint,p_idempotency_key uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_rev public.reward_revisions; v_item public.reward_items; v_response jsonb; v_payload jsonb:=jsonb_build_object('revision',p_revision_id,'decision',p_decision,'name',p_final_name,'url',p_final_product_url,'price',p_final_estimated_price_cents,'cost',p_authoritative_xp_cost,'reusable',p_is_reusable,'note',p_review_note,'version',p_expected_reward_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('review_reward_revision',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_rev from public.reward_revisions where id=p_revision_id for update; if not found then raise exception 'revision not found'; end if;
 select * into v_item from public.reward_items where id=v_rev.reward_id for update;
 perform private.require_profile_cloud_authoritative(v_item.profile_id);
 perform private.require_parent(v_item.family_id,true);
 if v_item.version<>p_expected_reward_version then raise exception 'stale reward version' using errcode='40001'; end if;
 if v_rev.status<>'pending' then raise exception 'revision is not pending'; end if;
 if p_decision not in ('approve','decline') then raise exception 'decision must be approve or decline'; end if;
 if char_length(btrim(coalesce(p_review_note,''))) not between 3 and 1000 then raise exception 'bounded audit note required'; end if;
 if p_decision='approve' and coalesce(p_authoritative_xp_cost,0)<=0 then raise exception 'positive authoritative XP cost required'; end if;
 if p_decision='approve' and char_length(btrim(coalesce(p_final_name,''))) not between 1 and 120 then raise exception 'final reward name is required'; end if;
 if p_decision='approve' and not private.safe_product_url(nullif(btrim(p_final_product_url),'')) then raise exception 'unsafe final product URL'; end if;
 if p_decision='approve' and p_final_estimated_price_cents is not null and p_final_estimated_price_cents<0 then raise exception 'invalid final price'; end if;
 update public.reward_revisions set status=case when p_decision='approve' then 'approved' else 'declined' end,
   name=case when p_decision='approve' then btrim(p_final_name) else name end,
   product_url=case when p_decision='approve' then nullif(btrim(p_final_product_url),'') else product_url end,
   estimated_price_cents=case when p_decision='approve' then p_final_estimated_price_cents else estimated_price_cents end,
   reviewed_by=auth.uid(),reviewed_at=now(),review_note=nullif(btrim(p_review_note),'') where id=p_revision_id;
 if p_decision='approve' then
   update public.reward_items set status='approved',approved_revision_id=p_revision_id,
     authoritative_xp_cost=p_authoritative_xp_cost,is_reusable=p_is_reusable,version=version+1 where id=v_item.id;
 else
   update public.reward_items set status=case when approved_revision_id is null then 'declined' else status end,version=version+1 where id=v_item.id;
 end if;
 v_response:=jsonb_build_object('rewardId',v_item.id,'revisionId',p_revision_id,'decision',p_decision,'version',p_expected_reward_version+1);
 perform private.write_audit(v_item.family_id,v_item.profile_id,'parent','reward_revision_'||p_decision,'reward_revisions',p_revision_id::text,p_review_note,to_jsonb(v_rev),v_response);
 return private.store_receipt('review_reward_revision',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.archive_reward(
 p_reward_id uuid,p_expected_reward_version bigint,p_reason text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_item public.reward_items; v_response jsonb; v_payload jsonb:=jsonb_build_object('reward',p_reward_id,'version',p_expected_reward_version,'reason',p_reason); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('archive_reward',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_item from public.reward_items where id=p_reward_id for update; if not found then raise exception 'reward not found'; end if;
 perform private.require_profile_cloud_authoritative(v_item.profile_id);
 perform private.require_parent(v_item.family_id,true);
 if v_item.version<>p_expected_reward_version then raise exception 'stale reward version' using errcode='40001'; end if;
 if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'audit reason required'; end if;
 update public.reward_items set status='archived',archived_at=now(),version=version+1 where id=p_reward_id;
 update public.reward_goals set reward_id=null,version=version+1,updated_by=auth.uid(),updated_at=now() where profile_id=v_item.profile_id and reward_id=p_reward_id;
 v_response:=jsonb_build_object('rewardId',p_reward_id,'status','archived','version',p_expected_reward_version+1);
 perform private.write_audit(v_item.family_id,v_item.profile_id,'parent','reward_archived','reward_items',p_reward_id::text,p_reason,to_jsonb(v_item),v_response);
 return private.store_receipt('archive_reward',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.set_reward_goal(
 p_profile_id uuid,p_reward_id uuid,p_expected_goal_version bigint,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_profile uuid; v_item public.reward_items; v_goal public.reward_goals; v_response jsonb; v_payload jsonb:=jsonb_build_object('profile',p_profile_id,'reward',p_reward_id,'version',p_expected_goal_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('set_reward_goal',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 v_profile:=private.reward_actor_profile(p_profile_id);
 select * into v_goal from public.reward_goals where profile_id=v_profile for update;
 if not found then insert into public.reward_goals(profile_id,updated_by) values(v_profile,auth.uid()) returning * into v_goal; end if;
 if v_goal.version<>p_expected_goal_version then raise exception 'stale goal version' using errcode='40001'; end if;
 if p_reward_id is not null then
   select * into v_item from public.reward_items where id=p_reward_id and profile_id=v_profile;
   if not found or v_item.status<>'approved' or v_item.archived_at is not null then raise exception 'goal must be an approved active reward'; end if;
 end if;
 update public.reward_goals set reward_id=p_reward_id,version=version+1,updated_by=auth.uid(),updated_at=now() where profile_id=v_profile;
 v_response:=jsonb_build_object('profileId',v_profile,'rewardId',p_reward_id,'version',p_expected_goal_version+1);
 return private.store_receipt('set_reward_goal',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.request_redemption(
 p_redemption_id uuid,p_reward_id uuid,p_expected_reward_version bigint,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_assignment public.device_assignments:=private.require_active_assignment(); v_item public.reward_items; v_rev public.reward_revisions; v_balance public.profile_balances; v_response jsonb; v_payload jsonb:=jsonb_build_object('redemption',p_redemption_id,'reward',p_reward_id,'version',p_expected_reward_version); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('request_redemption',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_item from public.reward_items where id=p_reward_id for share;
 perform private.require_profile_cloud_authoritative(v_assignment.profile_id);
 if not found or v_item.profile_id<>v_assignment.profile_id or v_item.status<>'approved' or v_item.version<>p_expected_reward_version then raise exception 'approved current reward not found'; end if;
 select * into v_rev from public.reward_revisions where id=v_item.approved_revision_id;
 select * into v_balance from public.profile_balances where profile_id=v_assignment.profile_id;
 if v_balance.available_xp<v_item.authoritative_xp_cost then raise exception 'insufficient XP'; end if;
 perform private.rate_limit(auth.uid()::text,'redemption_request',10,interval '1 hour');
 insert into public.redemption_requests(id,family_id,profile_id,reward_id,reward_revision_id,reward_name_snapshot,xp_cost_snapshot,requested_by)
 values(p_redemption_id,v_item.family_id,v_item.profile_id,v_item.id,v_rev.id,v_rev.name,v_item.authoritative_xp_cost,auth.uid());
 v_response:=jsonb_build_object('redemptionId',p_redemption_id,'status','pending');
 perform private.write_audit(v_item.family_id,v_item.profile_id,'child_device','redemption_requested','redemption_requests',p_redemption_id::text,null,null,v_response);
 return private.store_receipt('request_redemption',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.resolve_redemption(
 p_redemption_id uuid,p_decision text,p_expected_version bigint,p_note text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_req public.redemption_requests; v_item public.reward_items; v_ledger public.xp_ledger; v_response jsonb; v_payload jsonb:=jsonb_build_object('redemption',p_redemption_id,'decision',p_decision,'version',p_expected_version,'note',p_note); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('resolve_redemption',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_req from public.redemption_requests where id=p_redemption_id for update; if not found then raise exception 'redemption not found'; end if;
 perform private.require_profile_cloud_authoritative(v_req.profile_id);
 perform private.require_parent(v_req.family_id,true);
 if v_req.status<>'pending' or v_req.version<>p_expected_version then raise exception 'stale or resolved redemption' using errcode='40001'; end if;
 if p_decision not in ('approve','decline') then raise exception 'decision must be approve or decline'; end if;
 if p_decision='approve' then
   select * into v_item from public.reward_items where id=v_req.reward_id for update;
   if not found or v_item.status<>'approved' or v_item.archived_at is not null then
     raise exception 'reward is no longer approved and active';
   end if;
   v_ledger:=private.apply_ledger(v_req.profile_id,'reward_spend',0,-v_req.xp_cost_snapshot,p_idempotency_key,
     coalesce(nullif(btrim(p_note),''),'approved reward redemption'),null,v_req.id);
 end if;
 update public.redemption_requests set status=case when p_decision='approve' then 'approved' else 'declined' end,
   resolved_by=auth.uid(),resolved_at=now(),resolution_note=btrim(p_note),
   spend_ledger_id=case when p_decision='approve' then v_ledger.id else null end,
   version=version+1 where id=p_redemption_id;
 if p_decision='approve' then
   if not v_item.is_reusable then update public.reward_items set status='redeemed',redeemed_at=now(),version=version+1 where id=v_item.id; end if;
   update public.reward_goals set reward_id=null,version=version+1,updated_by=auth.uid(),updated_at=now() where profile_id=v_req.profile_id and reward_id=v_req.reward_id;
 end if;
 v_response:=jsonb_build_object('redemptionId',p_redemption_id,'status',case when p_decision='approve' then 'approved' else 'declined' end,'version',p_expected_version+1,'ledgerId',case when p_decision='approve' then v_ledger.id else null end);
 perform private.write_audit(v_req.family_id,v_req.profile_id,'parent','redemption_'||p_decision,'redemption_requests',p_redemption_id::text,p_note,to_jsonb(v_req),v_response);
 return private.store_receipt('resolve_redemption',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.reverse_redemption(
 p_redemption_id uuid,p_expected_version bigint,p_reason text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_req public.redemption_requests; v_spend public.xp_ledger; v_rev public.xp_ledger; v_item public.reward_items; v_response jsonb; v_payload jsonb:=jsonb_build_object('redemption',p_redemption_id,'version',p_expected_version,'reason',p_reason); v_prior jsonb;
begin
 v_prior:=private.prior_receipt('reverse_redemption',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_req from public.redemption_requests where id=p_redemption_id for update; if not found then raise exception 'redemption not found'; end if;
 perform private.require_profile_cloud_authoritative(v_req.profile_id);
 perform private.require_parent(v_req.family_id,true);
 if v_req.status<>'approved' or v_req.version<>p_expected_version or v_req.spend_ledger_id is null then raise exception 'stale or non-approved redemption' using errcode='40001'; end if;
 if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'audit reason required'; end if;
 select * into v_spend from public.xp_ledger where id=v_req.spend_ledger_id;
 v_rev:=private.apply_ledger(v_req.profile_id,'reversal',-v_spend.lifetime_delta,-v_spend.available_delta,p_idempotency_key,p_reason,null,v_req.id,v_spend.id);
 update public.redemption_requests set status='reversed',reversal_ledger_id=v_rev.id,version=version+1 where id=p_redemption_id;
 select * into v_item from public.reward_items where id=v_req.reward_id for update;
 if not v_item.is_reusable and v_item.status='redeemed' then update public.reward_items set status='approved',redeemed_at=null,version=version+1 where id=v_item.id; end if;
 v_response:=jsonb_build_object('redemptionId',p_redemption_id,'status','reversed','version',p_expected_version+1,'ledgerId',v_rev.id);
 perform private.write_audit(v_req.family_id,v_req.profile_id,'parent','redemption_reversed','redemption_requests',p_redemption_id::text,p_reason,to_jsonb(v_req),v_response);
 return private.store_receipt('reverse_redemption',p_idempotency_key,v_payload,v_response);
end;
$$;

create or replace function public.resolve_xp_evidence_review(
 p_event_id uuid,p_decision text,p_reason text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public
as $$
declare v_event public.xp_evidence_events; v_family uuid; v_ledger public.xp_ledger; v_response jsonb;
 v_payload jsonb:=jsonb_build_object('event',p_event_id,'decision',p_decision,'reason',p_reason); v_prior jsonb;
 v_count integer; v_state private.xp_attempt_state; v_facts private.profile_xp_facts;
 v_catalog private.content_catalog; v_correct boolean;
begin
 v_prior:=private.prior_receipt('resolve_xp_evidence_review',p_idempotency_key,v_payload); if v_prior is not null then return v_prior; end if;
 select * into v_event from public.xp_evidence_events where event_id=p_event_id for update;
 if not found then raise exception 'evidence not found'; end if;
 select family_id into v_family from public.child_profiles where id=v_event.profile_id;
 perform private.require_profile_cloud_authoritative(v_event.profile_id);
 perform private.require_parent(v_family,true);
 if v_event.status<>'needs_review' then raise exception 'evidence is not awaiting review'; end if;
 if p_decision not in ('approve','reject') then raise exception 'decision must be approve or reject'; end if;
 if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'audit reason required'; end if;
 if p_decision='approve' and v_event.awarded_xp>0 then
   v_ledger:=private.apply_ledger(v_event.profile_id,'earned',v_event.awarded_xp,v_event.awarded_xp,
     p_idempotency_key,p_reason,v_event.event_id,null,null,jsonb_build_object('reviewed',true));
 end if;
 if p_decision='approve' and v_event.evidence_kind in (
   'analogy_type_correct','analogy_bridge_lock','analogy_discard','analogy_final'
 ) then
   select * into v_state from private.xp_attempt_state
    where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id for update;
   if not found or v_state.completed then raise exception 'reviewed analogy attempt state is stale' using errcode='40001'; end if;
   if v_event.evidence_kind='analogy_type_correct' then
     if v_state.type_awarded then raise exception 'reviewed type transition is stale' using errcode='40001'; end if;
     update private.xp_attempt_state set type_awarded=true where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id;
   elsif v_event.evidence_kind='analogy_bridge_lock' then
     if v_state.bridge_awarded then raise exception 'reviewed bridge transition is stale' using errcode='40001'; end if;
     update private.xp_attempt_state set bridge_awarded=true where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id;
   elsif v_event.evidence_kind='analogy_discard' then
     if v_event.payload->>'choice'=any(v_state.discarded_choices) then raise exception 'reviewed discard transition is stale' using errcode='40001'; end if;
     update private.xp_attempt_state set discarded_choices=array_append(discarded_choices,v_event.payload->>'choice') where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id;
   else
     if v_state.final_awarded then raise exception 'reviewed final transition is stale' using errcode='40001'; end if;
     select * into v_catalog from private.content_catalog where content_id=v_event.content_id and content_version=v_event.content_version;
     if not found then raise exception 'reviewed analogy catalog entry is missing' using errcode='40001'; end if;
     v_correct:=coalesce(v_event.payload->>'choice'=v_catalog.correct_choice,false);
     update private.xp_attempt_state set final_awarded=true,correct=v_correct where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id;
   end if;
 end if;
 if p_decision='approve' and v_event.evidence_kind='analogy_complete' then
   select * into v_state from private.xp_attempt_state
    where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id for update;
   if not found or v_state.completed or not v_state.final_awarded then
     raise exception 'reviewed analogy attempt state is stale' using errcode='40001';
   end if;
   insert into private.profile_xp_facts(profile_id) values(v_event.profile_id) on conflict do nothing;
   update private.profile_xp_facts set
    completed_analogy_count=completed_analogy_count+1,
    correct_analogy_count=correct_analogy_count+case when v_state.correct then 1 else 0 end,
    correct_streak=case when v_state.correct then correct_streak+1 else 0 end
    where profile_id=v_event.profile_id returning * into v_facts;
   insert into private.analogy_completion_facts(profile_id,content_id,completed_ordinal)
    values(v_event.profile_id,v_event.content_id,v_facts.completed_analogy_count);
   update private.xp_attempt_state set completed=true
    where assignment_id=v_event.assignment_id and attempt_id=v_event.attempt_id;
 end if;
 if p_decision='approve' and v_event.evidence_kind='vocab_answer' then
   select * into v_catalog from private.content_catalog
    where content_id=v_event.content_id and content_version=v_event.content_version;
   v_correct:=coalesce(v_event.payload->>'choice'=v_catalog.correct_choice,false);
   insert into private.profile_xp_facts(profile_id) values(v_event.profile_id) on conflict do nothing;
   update private.profile_xp_facts set vocab_answer_count=vocab_answer_count+1
    where profile_id=v_event.profile_id;
   if v_correct then
     insert into private.vocab_xp_facts(profile_id,vocab_id)
      values(v_event.profile_id,v_catalog.metadata->>'vocabId') on conflict do nothing;
     if v_catalog.metadata->>'questionType'='context' then
       update private.vocab_xp_facts set
        correct_context_count=correct_context_count+1,
        mastery_bonus_awarded=mastery_bonus_awarded or (correct_context_count+1>=2)
        where profile_id=v_event.profile_id and vocab_id=v_catalog.metadata->>'vocabId';
     end if;
   end if;
 end if;
 update public.xp_evidence_events set status=case when p_decision='approve' then 'accepted' else 'rejected' end,
   review_reason=review_reason||'; parent '||p_decision||': '||btrim(p_reason) where event_id=p_event_id;
 if p_decision='approve' and v_event.evidence_kind='vocab_answer' then
   select count(*) + coalesce((select vocab_done from private.daily_progress_facts
    where profile_id=v_event.profile_id and family_local_date=v_event.family_local_date),0) into v_count from public.xp_evidence_events where profile_id=v_event.profile_id
    and family_local_date=v_event.family_local_date and evidence_kind='vocab_answer' and status='accepted';
   if v_count>=20 and not exists(select 1 from public.daily_award_claims where profile_id=v_event.profile_id
     and family_local_date=v_event.family_local_date and award_kind='vocab_day_bonus') then
     v_ledger:=private.apply_ledger(v_event.profile_id,'earned',15,15,gen_random_uuid(),
       'reviewed evidence completed vocabulary daily goal',null,null,null,jsonb_build_object('awardKind','vocab_day_bonus','date',v_event.family_local_date));
     insert into public.daily_award_claims(profile_id,family_local_date,award_kind,ledger_id)
       values(v_event.profile_id,v_event.family_local_date,'vocab_day_bonus',v_ledger.id);
   end if;
 end if;
 if p_decision='approve' and v_event.evidence_kind='analogy_complete' then
   select count(*)+coalesce((select analogy_completed from private.daily_progress_facts
    where profile_id=v_event.profile_id and family_local_date=v_event.family_local_date),0)
    into v_count from public.xp_evidence_events where profile_id=v_event.profile_id
    and family_local_date=v_event.family_local_date and evidence_kind='analogy_complete'
    and (status='accepted' or event_id=v_event.event_id);
   if v_count>=8 and exists(select 1 from public.daily_award_claims where profile_id=v_event.profile_id
     and family_local_date=v_event.family_local_date and award_kind='exit_ticket')
    and not exists(select 1 from public.daily_award_claims where profile_id=v_event.profile_id
     and family_local_date=v_event.family_local_date and award_kind='analogy_day_bonus') then
     v_ledger:=private.apply_ledger(v_event.profile_id,'earned',25,25,gen_random_uuid(),
      'reviewed evidence completed analogy daily goal',null,null,null,
      jsonb_build_object('awardKind','analogy_day_bonus','date',v_event.family_local_date));
     insert into public.daily_award_claims(profile_id,family_local_date,award_kind,ledger_id)
      values(v_event.profile_id,v_event.family_local_date,'analogy_day_bonus',v_ledger.id);
   end if;
 end if;
 v_response:=jsonb_build_object('eventId',p_event_id,'status',case when p_decision='approve' then 'accepted' else 'rejected' end,'ledgerId',case when p_decision='approve' then v_ledger.id else null end);
 perform private.write_audit(v_family,v_event.profile_id,'parent','xp_evidence_'||p_decision,'xp_evidence_events',p_event_id::text,p_reason,to_jsonb(v_event),v_response);
 return private.store_receipt('resolve_xp_evidence_review',p_idempotency_key,v_payload,v_response);
end;
$$;

revoke all on function private.reward_actor_profile(uuid),private.store_receipt(text,uuid,jsonb,jsonb),private.prior_receipt(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.submit_reward_proposal(uuid,uuid,uuid,text,text,integer,uuid,uuid),
 public.submit_reward_revision(uuid,uuid,bigint,text,text,integer,uuid,uuid),
 public.withdraw_reward_revision(uuid,bigint,uuid),
 public.parent_edit_reward(uuid,uuid,bigint,text,text,integer,uuid,integer,boolean,text,uuid),
 public.review_reward_revision(uuid,text,text,text,integer,integer,boolean,text,bigint,uuid),
 public.archive_reward(uuid,bigint,text,uuid),public.set_reward_goal(uuid,uuid,bigint,uuid),
 public.request_redemption(uuid,uuid,bigint,uuid),public.resolve_redemption(uuid,text,bigint,text,uuid),
 public.reverse_redemption(uuid,bigint,text,uuid),public.resolve_xp_evidence_review(uuid,text,text,uuid) from public,anon;
grant execute on function public.submit_reward_proposal(uuid,uuid,uuid,text,text,integer,uuid,uuid),
 public.submit_reward_revision(uuid,uuid,bigint,text,text,integer,uuid,uuid),
 public.withdraw_reward_revision(uuid,bigint,uuid),
 public.parent_edit_reward(uuid,uuid,bigint,text,text,integer,uuid,integer,boolean,text,uuid),
 public.review_reward_revision(uuid,text,text,text,integer,integer,boolean,text,bigint,uuid),
 public.archive_reward(uuid,bigint,text,uuid),public.set_reward_goal(uuid,uuid,bigint,uuid),
 public.request_redemption(uuid,uuid,bigint,uuid),public.resolve_redemption(uuid,text,bigint,text,uuid),
 public.reverse_redemption(uuid,bigint,text,uuid),public.resolve_xp_evidence_review(uuid,text,text,uuid) to authenticated;
