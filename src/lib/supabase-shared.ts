// Shared Supabase config. No next/headers import here, so this file is safe
// to use from both client and server code.

// Placeholder values keep the app building/running before env vars are set.
// With placeholders, auth and database calls will fail gracefully at runtime;
// set the real values in .env.local (see .env.example).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
