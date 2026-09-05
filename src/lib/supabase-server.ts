import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequiredEnv } from "@/lib/env";

// Server-side Supabase client bound to the current request's auth
// session cookies (anon key + RLS applies). Use this in Route Handlers
// and Server Components to act *as the logged-in staff member* --
// never use this for the webhook, which has no user session.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a context that can't set cookies (e.g. a Server
            // Component render). Safe to ignore -- middleware refreshes
            // the session cookie on every request.
          }
        },
      },
    }
  );
}
