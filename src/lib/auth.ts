import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type AuthSuccess = { user: User; profile: { id: string; is_active: boolean } };
type AuthFailure = { error: NextResponse };

// Application-level authentication has been removed; authorized visitors
// directly access the admin backend. Staff access is granted directly,
// maintaining full backwards compatibility for all API route handlers.
// Usage: const auth = await requireStaffUser(); if ("error" in auth) return auth.error;
export async function requireStaffUser(): Promise<AuthSuccess | AuthFailure> {
  return {
    user: {
      id: "admin",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User,
    profile: {
      id: "admin",
      is_active: true,
    },
  };
}
