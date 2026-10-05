import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard (.agent/phase_2.txt item 13).
 *
 * Named `proxy.ts` following Next 16's rename of the `middleware` convention
 * (`npx @next/codemod@canary middleware-to-proxy`); the export is `proxy`
 * rather than `middleware`.
 *
 * The check is deliberately cookie-only — no upstream round trip — because the
 * proxy runs on the Edge runtime, where `next/headers` (and therefore anything
 * under src/server) is unavailable. `at` is inlined here instead of imported
 * from src/server/session for that reason; keep the two in sync.
 *
 * A *stale* token is caught by the BFF itself, which refreshes once or answers
 * 401 and clears the cookies, and the client-side 401 handling then redirects to
 * /login.
 */

const ACCESS_COOKIE = "at";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

/** Prefixes that must never be redirected — the BFF answers with its own envelope. */
function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Signed-in users have no reason to see the auth pages.
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!hasSession && !isAuthRoute && !isApiPath(pathname)) {
    // Preserve the intended destination so login can bounce back to it.
    const target = new URL("/login", request.url);
    if (pathname !== "/" && !pathname.startsWith("/_")) {
      target.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the BFF itself and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
