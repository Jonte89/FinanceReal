import { NextRequest, NextResponse } from "next/server";

// Simple HTTP Basic Auth guard for the whole app. Set APP_PASSWORD (and
// optionally APP_USER, default "admin") in the environment to enable it. If
// APP_PASSWORD is unset (e.g. local dev), the app is left open.
export function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const expectedUser = process.env.APP_USER || "admin";
  const header = request.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    const [user, pass] = atob(header.slice(6)).split(":");
    if (user === expectedUser && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Finance Tracker"' },
  });
}

// Run on every route except Next.js internals and the favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
