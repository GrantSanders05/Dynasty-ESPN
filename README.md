# Dynasty Hub (Simple)

A super lightweight, ESPN-style public landing page for your dynasty.

## What it includes
- Public **Home**
- **Articles** page (weekly recaps)
- **Social Wall** page (anyone can post text + optional image)
- Supabase Postgres for posts
- Supabase Storage for images

No TypeScript. No auth. Minimal files. Easy to expand later.

## Supabase setup
1. Create a Supabase project
2. SQL Editor → run `supabase.sql`
3. Storage → verify bucket `uploads` exists and is public

## Env vars (local + Vercel)
Set these:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Run locally
npm install
npm run dev

## Deploy
Import repo into Vercel and add the env vars.
