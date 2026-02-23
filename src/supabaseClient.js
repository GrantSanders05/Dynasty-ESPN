import { createClient } from "@supabase/supabase-js";

// Vercel must have these env vars at BUILD time.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "In Vercel: Settings → Environment Variables, then redeploy."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Setting storage explicitly prevents rare “session disappears” edge cases.
    storage: window.localStorage,
  },
});
