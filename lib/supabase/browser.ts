import { supabase, supabaseUrl } from "@/lib/supabaseClient";

// Export the exact name the app imports
export function supabaseBrowser() {
  return supabase;
}

export { supabase, supabaseUrl };
