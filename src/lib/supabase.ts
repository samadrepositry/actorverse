import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabase-shared";

export { isSupabaseConfigured };

/** Browser-side Supabase client (client components). */
export function createClient(): SupabaseClient {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
