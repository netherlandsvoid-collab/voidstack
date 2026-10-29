-- One private bucket for all files. The server controls read access and issues
-- signed uploads for individual paths. Do not add public browser write policies.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voidstack-media', 'voidstack-media', false, 10485760, array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','application/zip','application/x-zip-compressed',
  'application/pdf','application/octet-stream'
])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
commit;
