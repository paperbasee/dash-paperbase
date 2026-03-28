import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * Locale negotiation (next-intl) runs first, then the existing auth_session gate.
 */

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/plan-not-active",
  "/reset-password",
  "/verify-email",
  "/auth",
  "/order",
  "/billing",
];

function stripLocalePath(pathname: string): string {
  const match = pathname.match(/^\/(en|bn)(?=\/|$)/);
  if (!match) return pathname;
  const rest = pathname.slice(match[0].length);
  if (rest === "" || rest === "/") return "/";
  return rest.startsWith("/") ? rest : `/${rest}`;
}

function localeFromPath(pathname: string): string {
  const m = pathname.match(/^\/(en|bn)(?=\/|$)/);
  return m ? m[1]! : routing.defaultLocale;
}

function isPublicPath(strippedPathname: string): boolean {
  if (strippedPathname === "/auth" || strippedPathname.startsWith("/auth/")) {
    return true;
  }
  return PUBLIC_PATHS.filter((p) => p !== "/auth").some(
    (p) => strippedPathname === p || strippedPathname.startsWith(p + "/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const stripped = stripLocalePath(pathname);
  const authSession = request.cookies.get("auth_session");
  const isAuthed = !!authSession?.value;
  const locale = localeFromPath(pathname);

  if (!isPublicPath(stripped) && !isAuthed) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && (stripped === "/login" || stripped === "/signup")) {
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_next/static|_next/image|_vercel|.*\\..*).*)"],
};
