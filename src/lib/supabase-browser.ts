import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client that shares the same cookie-based auth
// session as supabase-server.ts / middleware.ts. Using this (instead of
// a bare @supabase/supabase-js client) is required so Realtime
// subscriptions run as the authenticated staff member -- Row Level
// Security only allows reads for a signed-in user with an active
// profile, so an unauthenticated client now receives no rows/events.
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
