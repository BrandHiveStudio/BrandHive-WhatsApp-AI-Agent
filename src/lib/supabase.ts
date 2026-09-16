import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";

let _supabase: SupabaseClient | null = null;

// Server-only client using the service-role key (bypasses RLS). Never
// import this from a client component -- it must stay server-side.
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    const client = getSupabase() as unknown as Record<string | symbol, unknown>;
    return client[prop];
  },
});
