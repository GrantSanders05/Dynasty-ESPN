# Dynasty Hub (CFB 26)

ESPN-style dynasty hub PWA for a private league. Data is ingested weekly by the Commissioner via screenshot uploads → AI extraction → preview → publish → screenshots deleted.

## Stack
- Next.js (App Router) on Vercel
- Supabase Auth + Postgres + Storage + Edge Functions

## Setup (high level)
1. Create a Supabase project.
2. Run the SQL in `/supabase/sql/01_schema.sql` and `/supabase/sql/02_rls.sql`.
3. Create Storage bucket: `temp-uploads` (private).
4. Deploy Edge Functions from `/supabase/functions/*` to Supabase.
5. Set env vars in Vercel and in Supabase Edge functions.

## Local dev
```bash
npm i
npm run dev
```

## Env vars
Create `.env.local`:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
