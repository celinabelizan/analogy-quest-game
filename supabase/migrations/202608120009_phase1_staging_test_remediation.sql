-- SSAT Quest secure synchronization, Phase 1: forward-only staging remediation.
--
-- Migrations 001-008 have already been applied to synthetic staging. Keep their
-- history immutable and repair the enum assignments and service-role access here.

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
 update public.reward_revisions set status=case when p_decision='approve'
     then 'approved'::public.reward_revision_status
     else 'declined'::public.reward_revision_status end,
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
 update public.redemption_requests set status=case when p_decision='approve'
     then 'approved'::public.redemption_status
     else 'declined'::public.redemption_status end,
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

-- Edge Functions authenticate callers themselves and use the service role only
-- for these bounded table operations. Keep private-schema tables inaccessible.
grant usage on schema public to service_role;
grant select on public.child_profiles, public.parent_memberships,
  public.device_assignments, public.migration_capture_requests,
  public.reward_items, public.reward_image_assets to service_role;
grant insert, update on public.reward_image_assets to service_role;
