import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Optimistic auth gate for the whole app: valid session cookie or you get
// redirected to /login (pages) / a 401 (APIs). This is only a first line of
// defense — every API route re-verifies the session via requireUserId().
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public: the login page and the auth endpoints themselves.
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  if (userId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// Run on every route except Next.js internals and the favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
