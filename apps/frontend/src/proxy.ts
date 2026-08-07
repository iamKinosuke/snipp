import { NextResponse, type NextProxy } from "next/server";

import {
  EXPIRED_SESSION_PARAM,
  EXPIRED_SESSION_VALUE,
  isSessionExpired,
  parseSessionCookie,
  SESSION_COOKIE,
} from "@/lib/session";

const PUBLIC_APP_PATHS: ReadonlySet<string> = new Set([
  "/app/login",
  "/app/signup",
]);

export const proxy: NextProxy = (request) => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  if (PUBLIC_APP_PATHS.has(request.nextUrl.pathname)) {
    const response = NextResponse.next();

    if (
      raw !== undefined &&
      request.nextUrl.searchParams.get(EXPIRED_SESSION_PARAM) ===
        EXPIRED_SESSION_VALUE
    ) {
      response.cookies.delete(SESSION_COOKIE);
    }

    return response;
  }

  const session = parseSessionCookie(raw);

  if (session !== null && !isSessionExpired(session)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/app/login";
  url.search = "";
  if (raw !== undefined) {
    url.searchParams.set(EXPIRED_SESSION_PARAM, EXPIRED_SESSION_VALUE);
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
};

export const config = {
  matcher: ["/app", "/app/:path*"],
};
