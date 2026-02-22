import { supabase, supabaseUrl } from "@/lib/supabaseClient";

// Export the exact name the app imports
export function supabaseServer() {
  // MVP: return the same client. Later we can wire real SSR cookie auth.
  return supabase;
}

export { supabase, supabaseUrl };
