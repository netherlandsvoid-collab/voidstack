-- Optional Supabase migration target. NOT used by the default SQLite runtime.
-- Apply only when implementing the Supabase repository adapter and auth callback.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 username text unique not null check(username ~ '^[a-z0-9_]{3,24}$'),
 name text not null, bio text default '', discipline text default '',
 avatar_path text, website text, created_at timestamptz default now()
);
create table public.blocks (user_id uuid references public.profiles, target_id uuid references public.profiles, primary key(user_id,target_id), check(user_id<>target_id));
create table public.follows (user_id uuid references public.profiles, target_id uuid references public.profiles, primary key(user_id,target_id), check(user_id<>target_id));
create table public.posts (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, caption text not null check(length(caption)<=3000), media jsonb default '[]', created_at timestamptz default now());
create table public.likes (user_id uuid references public.profiles, post_id uuid references public.posts on delete cascade, primary key(user_id,post_id));
create table public.saves (user_id uuid references public.profiles, post_id uuid references public.posts on delete cascade, primary key(user_id,post_id));
create table public.comments (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, post_id uuid references public.posts on delete cascade, body text not null check(length(body)<=1000), created_at timestamptz default now());
create table public.messages (id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles, recipient_id uuid not null references public.profiles, body text check(length(body)<=2000), attachment_path text, read_at timestamptz, created_at timestamptz default now(), check(sender_id<>recipient_id));
create table public.products (id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles, title text not null, description text not null, amount_cents integer not null check(amount_cents>=100), currency text default 'usd', previews jsonb default '[]', formats text, compatibility text, licence text, category text, status text not null default 'draft' check(status in ('draft','published','archived')), created_at timestamptz default now());
-- Downloadable paths are intentionally absent from public product rows.
create table public.product_files (product_id uuid primary key references public.products, seller_id uuid not null references public.profiles, storage_path text not null);
create table public.orders (id uuid primary key default gen_random_uuid(), buyer_id uuid not null references public.profiles, product_id uuid not null references public.products, seller_id uuid not null references public.profiles, amount_cents integer not null, stripe_session_id text unique, payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded','expired')), mode text not null, created_at timestamptz default now());
create table public.webhook_events (id text primary key, created_at timestamptz default now());
create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid references public.profiles, target_id text not null, reason text not null, status text default 'open', created_at timestamptz default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, actor_id uuid references public.profiles, body text not null, target text, read_at timestamptz, created_at timestamptz default now());
create function public.is_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from blocks where (user_id=a and target_id=b) or (user_id=b and target_id=a)) $$;
alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_insert on public.profiles for insert with check(auth.uid()=id);
create policy profiles_update on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);
create policy blocks_owner on public.blocks for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy follows_read on public.follows for select using(true);
create policy follows_insert on public.follows for insert with check(auth.uid()=user_id and not public.is_blocked(user_id,target_id));
create policy follows_delete on public.follows for delete using(auth.uid()=user_id);
create policy posts_read on public.posts for select using(true);
create policy posts_owner on public.posts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy likes_read on public.likes for select using(true);
create policy likes_owner on public.likes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy saves_owner on public.saves for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy comments_read on public.comments for select using(true);
create policy comments_owner on public.comments for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy messages_participants on public.messages for select using(auth.uid() in (sender_id,recipient_id));
create policy messages_send on public.messages for insert with check(auth.uid()=sender_id and not public.is_blocked(sender_id,recipient_id));
-- Message read receipts must use a privileged endpoint that changes only read_at.
create policy products_read on public.products for select using(status='published' or auth.uid()=seller_id);
create policy products_owner on public.products for all using(auth.uid()=seller_id) with check(auth.uid()=seller_id);
create policy product_files_owner on public.product_files for all using(auth.uid()=seller_id) with check(auth.uid()=seller_id and exists(select 1 from public.products p where p.id=product_id and p.seller_id=auth.uid()));
-- Orders/payment events may only be written by the verified webhook server.
create policy orders_participants on public.orders for select using(auth.uid() in (buyer_id,seller_id));
create policy reports_insert on public.reports for insert with check(auth.uid()=reporter_id);
create policy reports_read_own on public.reports for select using(auth.uid()=reporter_id);
create policy notifications_read on public.notifications for select using(auth.uid()=user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('previews','previews',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
 ('product-files','product-files',false,10485760,null),
 ('message-images','message-images',false,10485760,array['image/jpeg','image/png','image/webp']);
create policy public_previews on storage.objects for select using(bucket_id='previews');
create policy upload_own_previews on storage.objects for insert with check(bucket_id='previews' and (storage.foldername(name))[1]=auth.uid()::text);
create policy upload_own_files on storage.objects for insert with check(bucket_id='product-files' and (storage.foldername(name))[1]=auth.uid()::text);
-- No browser SELECT on product-files: the authenticated server verifies a paid
-- order, then issues a 60-second signed URL using its private service credentials.
create policy upload_message_images on storage.objects for insert with check(bucket_id='message-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy participants_read_images on storage.objects for select using(bucket_id='message-images' and exists(select 1 from public.messages m where m.attachment_path=name and auth.uid() in (m.sender_id,m.recipient_id)));
create index messages_recipient_created on public.messages(recipient_id,created_at desc);
create index posts_created on public.posts(created_at desc);
create index products_status_created on public.products(status,created_at desc);
create index orders_buyer on public.orders(buyer_id,payment_status);
-- Enable messages for Supabase Realtime after the runtime adapter is implemented:
-- alter publication supabase_realtime add table public.messages;
