import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/decks", "/review"];

// Edge-safe presence check. Auth.js v5 + DrizzleAdapter cannot run on the
// Edge runtime (pulls in node:crypto / node:fs); pulling them via auth()
// here would force the middleware to the Node runtime, which is still
// experimental in Next 16. A cookie-presence check is enough — actual
// session validation happens at the page / server-action boundary via
// src/lib/auth/require-user.ts. A stale or forged cookie will pass this
// gate but fail there.
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasSession = SESSION_COOKIE_NAMES.some((name) =>
    req.cookies.has(name),
  );
  if (isProtected && !hasSession) {
    const url = new URL("/", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
