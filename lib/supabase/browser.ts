import { supabase, supabaseUrl } from "@/lib/supabaseClient";

export function createBrowserClient() {
  return supabase;
}

export { supabase, supabaseUrl };
