import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy convention.
// Application-level authentication gate has been removed.
// When visitors access /login, redirect directly to the Admin Dashboard.
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

