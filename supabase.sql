-- DYNASTY HUB (SIMPLE) — Supabase SQL
-- Run this in Supabase SQL Editor (Project > SQL Editor)

create table if not exists public.articles (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  week int,
  title text not null,
  body text not null,
  author_name text
);

create table if not exists public.social_posts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  author_name text,
  content text not null,
  image_url text
);

alter table public.articles enable row level security;
alter table public.social_posts enable row level security;

drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public"
on public.articles
for select
to anon, authenticated
using (true);

drop policy if exists "social_select_public" on public.social_posts;
create policy "social_select_public"
on public.social_posts
for select
to anon, authenticated
using (true);

drop policy if exists "articles_insert_public" on public.articles;
create policy "articles_insert_public"
on public.articles
for insert
to anon, authenticated
with check (true);

drop policy if exists "social_insert_public" on public.social_posts;
create policy "social_insert_public"
on public.social_posts
for insert
to anon, authenticated
with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "public_read_uploads" on storage.objects;
create policy "public_read_uploads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'uploads');

drop policy if exists "public_insert_uploads" on storage.objects;
create policy "public_insert_uploads"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'uploads');

-- NOTE: This is intentionally wide-open to match "anyone can post anything".
-- If spam becomes a problem, we can lock this down later with a commissioner login.
