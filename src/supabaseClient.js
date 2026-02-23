import { createClient } from "@supabase/supabase-js";

// IMPORTANT (Vite):
// These are baked into the build at deploy time (Vercel env vars).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // If you ever see this in production, your Vercel env vars were not set
  // at the time the build ran.
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Make auth survive refresh:
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // flowType isn't required for email/password, but leaving default is fine.
  },
});
