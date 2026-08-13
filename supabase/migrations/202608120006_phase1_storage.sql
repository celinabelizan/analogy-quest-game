-- SSAT Quest secure synchronization, Phase 1: private Storage buckets and policies.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
 ('reward-images','reward-images',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('migration-backups','migration-backups',false,26214400,array['application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.storage_path_profile(p_name text)
returns uuid language plpgsql immutable security definer set search_path=pg_catalog as $$
declare v text;
begin
 if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' then return null; end if;
 v:=split_part(p_name,'/',2);
 begin return v::uuid; exception when invalid_text_representation then return null; end;
end $$;

-- Upload/update/delete are intentionally absent: authenticated browsers cannot write
-- Storage directly. Reviewed Edge Functions validate bytes then use service-role access.
drop policy if exists reward_images_authorized_read on storage.objects;
create policy reward_images_authorized_read on storage.objects for select to authenticated
using(bucket_id='reward-images' and (
 private.is_parent_of_profile(private.storage_path_profile(name))
 or private.is_active_child_profile(private.storage_path_profile(name))
));

drop policy if exists migration_backups_parent_read on storage.objects;
create policy migration_backups_parent_read on storage.objects for select to authenticated
using(bucket_id='migration-backups' and private.is_parent_of_profile(private.storage_path_profile(name)));

revoke all on function private.storage_path_profile(text) from public,anon;
grant execute on function private.storage_path_profile(text) to authenticated;

comment on policy reward_images_authorized_read on storage.objects is
 'Path is family/profile/...; only that profile child or family parent can read. No client write policy exists.';
