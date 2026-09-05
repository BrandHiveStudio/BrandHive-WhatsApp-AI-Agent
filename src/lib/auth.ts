import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AuthSuccess = { user: User; profile: { id: string; is_active: boolean } };
type AuthFailure = { error: NextResponse };

// Gate for every staff-facing API route: confirms there is a valid
// Supabase Auth session (verified against the Auth server, not just a
// decoded cookie) AND that the user has an active row in `profiles`.
// Usage: const auth = await requireStaffUser(); if ("error" in auth) return auth.error;
export async function requireStaffUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, profile };
}
