-- =========================
-- CFB 26 Dynasty ESPN Hub
-- Minimal schema + RLS
-- =========================

-- Extensions
create extension if not exists pgcrypto;

-- 1) Commissioner allow-list
create table if not exists public.commissioners (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Allow public read (so the app can check commissioner status)
alter table public.commissioners enable row level security;
drop policy if exists "commissioners_select_public" on public.commissioners;
create policy "commissioners_select_public"
on public.commissioners for select
to public
using (true);

-- Only existing commissioners can add/remove commissioners
drop policy if exists "commissioners_write_only_commissioners" on public.commissioners;
create policy "commissioners_write_only_commissioners"
on public.commissioners for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = auth.email())
)
with check (
  exists (select 1 from public.commissioners c where c.email = auth.email())
);

-- 2) Headlines
create table if not exists public.headlines (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  link text,
  priority int not null default 50,
  created_at timestamptz not null default now()
);

alter table public.headlines enable row level security;

drop policy if exists "headlines_select_public" on public.headlines;
create policy "headlines_select_public"
on public.headlines for select
to public
using (true);

drop policy if exists "headlines_write_commissioner" on public.headlines;
create policy "headlines_write_commissioner"
on public.headlines for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = auth.email())
)
with check (
  exists (select 1 from public.commissioners c where c.email = auth.email())
);

-- 3) Articles
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  week_label text,
  author text,
  published boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.articles enable row level security;

drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public"
on public.articles for select
to public
using (published = true);

drop policy if exists "articles_write_commissioner" on public.articles;
create policy "articles_write_commissioner"
on public.articles for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = auth.email())
)
with check (
  exists (select 1 from public.commissioners c where c.email = auth.email())
);

-- 4) Podcast episodes (metadata)
create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

alter table public.podcast_episodes enable row level security;

drop policy if exists "podcast_select_public" on public.podcast_episodes;
create policy "podcast_select_public"
on public.podcast_episodes for select
to public
using (true);

drop policy if exists "podcast_write_commissioner" on public.podcast_episodes;
create policy "podcast_write_commissioner"
on public.podcast_episodes for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = auth.email())
)
with check (
  exists (select 1 from public.commissioners c where c.email = auth.email())
);

-- 5) Social posts (anyone can post)
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Anonymous',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.social_posts enable row level security;

drop policy if exists "social_select_public" on public.social_posts;
create policy "social_select_public"
on public.social_posts for select
to public
using (true);

-- Allow inserts from anyone (anon or authenticated)
drop policy if exists "social_insert_public" on public.social_posts;
create policy "social_insert_public"
on public.social_posts for insert
to public
with check (char_length(content) between 1 and 800);

-- Only commissioner can delete (moderation)
drop policy if exists "social_delete_commissioner" on public.social_posts;
create policy "social_delete_commissioner"
on public.social_posts for delete
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = auth.email())
);

-- Optional: commissioner can edit posts (disabled by default)
-- create policy "social_update_commissioner"
-- on public.social_posts for update
-- to authenticated
-- using (exists (select 1 from public.commissioners c where c.email = auth.email()))
-- with check (exists (select 1 from public.commissioners c where c.email = auth.email()));

-- =======================================
-- STORAGE (podcasts bucket) NOTE
-- =======================================
-- In Supabase Dashboard:
-- 1) Storage > Create bucket: podcasts
-- 2) Set bucket to PUBLIC (so audio can play without signed URLs)
--
-- Then add these Storage policies (Dashboard → Storage → Policies) for bucket "podcasts":
-- - SELECT: allow public read
-- - INSERT/UPDATE/DELETE: allow only commissioner
--
-- (Supabase's storage policy UI generates SQL behind the scenes; keep it simple there.)
