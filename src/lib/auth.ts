import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";

export type AuthSuccess = {
  user: User;
  profile: { id: string; is_active: boolean; role?: string };
};
export type AuthFailure = { error: NextResponse };

/**
 * Returns true ONLY if explicit local development bypass is enabled.
 * Strictly forbidden in production (NODE_ENV === "production") or on Vercel (VERCEL === "1").
 */
export function isDevAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return false;
  }
  return process.env.ALLOW_DEV_AUTH_BYPASS === "true";
}

/**
 * Gate for every staff-facing API route:
 * 1. Checks for local dev bypass (only when explicitly enabled in non-production, non-Vercel environments).
 * 2. In production or standard mode, cryptographically verifies the Supabase Auth session via cookies.
 * 3. Checks the `profiles` table to confirm the user is an active staff/admin member.
 *
 * Usage:
 * const auth = await requireStaffUser();
 * if ("error" in auth) return auth.error;
 */
export async function requireStaffUser(): Promise<AuthSuccess | AuthFailure> {
  // 1. Explicit Development Bypass (local only, never on Vercel or in production)
  if (isDevAuthBypassEnabled()) {
    return {
      user: {
        id: "dev-staff-local",
        email: "staff@brandhive.io",
        app_metadata: {},
        user_metadata: { full_name: "BrandHive Dev Staff" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      profile: {
        id: "dev-staff-local",
        is_active: true,
        role: "admin",
      },
    };
  }

  // 2. Production Auth Verification via Supabase Auth server
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized: Valid staff session required." },
          { status: 401 }
        ),
      };
    }

    // 3. Authorization check in profiles table using authoritative server client
    const adminClient = getSupabase();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, is_active, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.is_active) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Account is not authorized as an active staff member." },
          { status: 403 }
        ),
      };
    }

    return { user, profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return {
      error: NextResponse.json(
        { error: `Authentication error: ${message}` },
        { status: 401 }
      ),
    };
  }
}
