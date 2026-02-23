# CFB 26 Dynasty — ESPN-Style Hub (Minimal Files)

This is a simple landing-page style website:
- **Home**: headlines + articles + podcast episodes (commissioner-managed)
- **Social**: anyone can post (public feed)

Tech:
- Vite + React (very small file count)
- Supabase (database, auth, storage)

## 1) Install
```bash
npm install
```

## 2) Add environment variables
Create a file named `.env` in the project root:

```bash
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) Supabase setup (tables + policies)
Run the SQL in `SUPABASE_SQL.sql` in the Supabase SQL Editor.

Then:
- Create a Storage bucket named **podcasts** and set it to **public**.

## 4) Run locally
```bash
npm run dev
```

## Deploy
Works great on Vercel:
- Framework: Vite
- Build Command: `npm run build`
- Output: `dist`
- Add the same env vars in Vercel.
