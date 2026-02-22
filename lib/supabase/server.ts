import { supabase, supabaseUrl } from "@/lib/supabaseClient";

export function createServerClient() {
  // For MVP: same client. (Later we can upgrade this to proper SSR auth cookies.)
  return supabase;
}

export { supabase, supabaseUrl };
