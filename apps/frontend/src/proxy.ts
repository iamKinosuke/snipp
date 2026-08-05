import { NextResponse, type NextProxy } from "next/server";

import {
  EXPIRED_SESSION_PARAM,
  EXPIRED_SESSION_VALUE,
  isSessionExpired,
  parseSessionCookie,
  SESSION_COOKIE,
} from "@/lib/session";

export const proxy: NextProxy = (request) => {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const session = parseSessionCookie(raw);

    if (session !== null && !isSessionExpired(session)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (raw !== undefined) {
      url.searchParams.set(EXPIRED_SESSION_PARAM, EXPIRED_SESSION_VALUE);
    }

    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const response = NextResponse.next();

  if (
    raw !== undefined &&
    request.nextUrl.searchParams.get(EXPIRED_SESSION_PARAM) ===
      EXPIRED_SESSION_VALUE
  ) {
    response.cookies.delete(SESSION_COOKIE);
  }

  return response;
};

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
