-- SSAT Quest secure synchronization, Phase 1: forward-only staging remediation.
--
-- PL/pgSQL exposes RETURNS TABLE column names as variables. Qualify every
-- offline_attempt_authorizations reference so the output variable expires_at
-- cannot shadow the table column during normal child token issuance.

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
  perform private.rate_limit(auth.uid()::text, 'issue_offline_attempt_authorizations', 10, interval '1 day');
  if (select count(*) from public.offline_attempt_authorizations as offline_token
      where offline_token.assignment_id = v_assignment.id
        and offline_token.issued_at >= now() - interval '1 day') + p_count > 250 then
    raise exception '250 authorization daily issuance limit exceeded';
  end if;
  select count(*) into v_existing
    from public.offline_attempt_authorizations as offline_token
    where offline_token.assignment_id = v_assignment.id
      and offline_token.consumed_at is null
      and offline_token.expires_at > now();
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

revoke all on function public.issue_offline_attempt_authorizations(integer) from public, anon;
grant execute on function public.issue_offline_attempt_authorizations(integer) to authenticated;
