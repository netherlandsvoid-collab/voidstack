-- Separate private product originals from the 10 MB media/preview bucket.
-- Default fits Supabase Free's per-file ceiling. For 100 MB / GB originals,
-- upgrade storage, then raise the project/global limit, this bucket's limit,
-- and PRODUCT_MAX_UPLOAD_MB together. Never make the bucket public.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('voidstack-products','voidstack-products',false,52428800,null)
on conflict (id) do update set public=false;
-- Preserve an administrator's higher file_size_limit on reruns.
commit;
