import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isDevAuthBypassEnabled } from "@/lib/auth";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/supabase-server";

// Next.js 16 proxy convention (replaces middleware.ts).
// Protects dashboard page navigation. Deliberately does NOT match /api/* routes
// (see `config.matcher` below) -- API routes enforce their own auth via requireStaffUser(),
// and the Meta WhatsApp webhook is never intercepted here.
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Allow static files and assets to pass through safely without auth interception
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next({ request });
  }

  const isLoginPage = pathname === "/login";
  const isPublicPolicyPage =
    pathname === "/privacy-policy" ||
    pathname === "/terms" ||
    pathname === "/data-deletion";

  // 1. Explicit Local Development Bypass (never allowed in production or on Vercel)
  if (isDevAuthBypassEnabled()) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request });
  }

  // 2. Production / Secure Authentication Gate
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isLoginPage && !isPublicPolicyPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const isDeleting = options?.maxAge === 0;
          response.cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            sameSite: options?.sameSite ?? "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: isDeleting ? 0 : (options?.maxAge ?? SESSION_MAX_AGE_SECONDS),
          });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginPage && !isPublicPolicyPage) {
    const redirectUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c);
    });
    return redirectResponse;
  }

  if (user && isLoginPage) {
    const redirectUrl = new URL("/", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

