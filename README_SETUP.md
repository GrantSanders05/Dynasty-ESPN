# Dynasty ESPN v2 (Vite + Supabase + Vercel)

## What’s new in v2
- Classic SportsCenter look with LIGHT GREEN accent
- Real pages: Home, Teams (dropdown), Podcast, Social
- Team pages with Key Players (no full rosters)
- Social: likes, dislikes, replies (public/anonymous)
- Podcast: commissioner can set Podcast Title + upload episodes

## 1) Supabase (SQL)
Run `SUPABASE_SQL_V2.sql` in Supabase SQL Editor.

## 2) Add the 5 teams
Supabase Table Editor → `teams`:
- name: Team name
- slug: url-safe (example: "georgia", "alabama", etc.)
- record: optional
- rank: optional number
- coach: optional

## 3) Vercel env vars
Set:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Redeploy.

## 4) Vercel routing
Keep `vercel.json` at repo root.

## 5) Storage bucket
Bucket must be named `podcasts`.
Commissioner-only upload should be enforced by your bucket policies.
