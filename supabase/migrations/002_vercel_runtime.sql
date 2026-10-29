-- Apply THIS file for the Vercel runtime. 001 is an unrelated historical design.
-- Existing local SQLite accounts are not imported: users must register again.
begin;
create table if not exists public.voidstack_records (
  kind text not null,
  id text not null,
  data jsonb not null,
  primary key (kind, id),
  constraint voidstack_record_id_matches check (data->>'id' = id),
  constraint voidstack_user_username_valid check (
    kind <> 'user' or (data->>'username' is not null and data->>'username' ~ '^[a-z0-9_]{3,24}$')
  )
);
create unique index if not exists voidstack_unique_username
  on public.voidstack_records (lower(data->>'username')) where kind = 'user';
-- Data access is server-only. The Next.js API enforces sessions and ownership.
-- Browser publishable keys and authenticated users cannot read this table directly.
alter table public.voidstack_records enable row level security;
revoke all on public.voidstack_records from public, anon, authenticated;
grant select, insert, update, delete on public.voidstack_records to service_role;

create or replace function public.voidstack_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.voidstack_records (kind, id, data)
  values ('user', new.id::text, jsonb_build_object(
    'id', new.id::text,
    'username', lower(new.raw_user_meta_data->>'username'),
    'name', left(coalesce(new.raw_user_meta_data->>'name', 'Creator'), 60),
    'bio', '', 'avatar', '', 'discipline', 'Creative explorer',
    'createdAt', floor(extract(epoch from now()) * 1000)
  ));
  return new;
end;
$$;
revoke all on function public.voidstack_create_profile() from public, anon, authenticated;
drop trigger if exists voidstack_on_signup on auth.users;
create trigger voidstack_on_signup after insert on auth.users
  for each row execute function public.voidstack_create_profile();

create or replace function public.voidstack_delete_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.voidstack_records where kind = 'user' and id = old.id::text;
  return old;
end;
$$;
revoke all on function public.voidstack_delete_profile() from public, anon, authenticated;
drop trigger if exists voidstack_on_delete on auth.users;
create trigger voidstack_on_delete after delete on auth.users
  for each row execute function public.voidstack_delete_profile();
commit;
