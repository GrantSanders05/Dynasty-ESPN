-- =========================
-- Dynasty ESPN v2 Migration
-- Adds: teams, key players, article-team mapping, social votes, social replies, site settings
-- Keeps existing tables: commissioners, headlines, articles, podcast_episodes, social_posts
-- =========================

create extension if not exists pgcrypto;

-- 1) Site settings
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public"
on public.site_settings for select
to public
using (true);

drop policy if exists "site_settings_write_commissioner" on public.site_settings;
create policy "site_settings_write_commissioner"
on public.site_settings for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
)
with check (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
);

-- 2) Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  record text,
  rank int,
  coach text,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public"
on public.teams for select
to public
using (true);

drop policy if exists "teams_write_commissioner" on public.teams;
create policy "teams_write_commissioner"
on public.teams for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
)
with check (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
);

-- 3) Key players per team
create table if not exists public.team_key_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  position text not null,
  player_name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, position)
);

alter table public.team_key_players enable row level security;

drop policy if exists "team_key_players_select_public" on public.team_key_players;
create policy "team_key_players_select_public"
on public.team_key_players for select
to public
using (true);

drop policy if exists "team_key_players_write_commissioner" on public.team_key_players;
create policy "team_key_players_write_commissioner"
on public.team_key_players for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
)
with check (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
);

-- 4) Article-Team mapping
create table if not exists public.article_team_map (
  article_id uuid not null references public.articles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, team_id)
);

alter table public.article_team_map enable row level security;

drop policy if exists "article_team_map_select_public" on public.article_team_map;
create policy "article_team_map_select_public"
on public.article_team_map for select
to public
using (true);

drop policy if exists "article_team_map_write_commissioner" on public.article_team_map;
create policy "article_team_map_write_commissioner"
on public.article_team_map for all
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
)
with check (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
);

-- 5) Social votes (public)
create table if not exists public.social_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  voter_key text not null,
  value int not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (post_id, voter_key)
);

alter table public.social_votes enable row level security;

drop policy if exists "social_votes_select_public" on public.social_votes;
create policy "social_votes_select_public"
on public.social_votes for select
to public
using (true);

drop policy if exists "social_votes_insert_public" on public.social_votes;
create policy "social_votes_insert_public"
on public.social_votes for insert
to public
with check (char_length(voter_key) between 10 and 80);

drop policy if exists "social_votes_update_public" on public.social_votes;
create policy "social_votes_update_public"
on public.social_votes for update
to public
using (true)
with check (value in (-1, 1));

-- 6) Social replies
create table if not exists public.social_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  parent_reply_id uuid references public.social_replies(id) on delete cascade,
  display_name text not null default 'Anonymous',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.social_replies enable row level security;

drop policy if exists "social_replies_select_public" on public.social_replies;
create policy "social_replies_select_public"
on public.social_replies for select
to public
using (true);

drop policy if exists "social_replies_insert_public" on public.social_replies;
create policy "social_replies_insert_public"
on public.social_replies for insert
to public
with check (char_length(content) between 1 and 600);

drop policy if exists "social_replies_delete_commissioner" on public.social_replies;
create policy "social_replies_delete_commissioner"
on public.social_replies for delete
to authenticated
using (
  exists (select 1 from public.commissioners c where c.email = (auth.jwt() ->> 'email'))
);

-- Seed podcast title
insert into public.site_settings(key, value)
values ('podcast_title', 'Dynasty Podcast')
on conflict (key) do nothing;
