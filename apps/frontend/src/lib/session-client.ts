"use client";

import {
  EXPIRED_SESSION_PARAM,
  EXPIRED_SESSION_VALUE,
  parseSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type Session,
} from "@/lib/session";

export function saveSession(session: Session): void {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function expireSession(): void {
  clearSession();
  window.location.assign(
    `/app/login?${EXPIRED_SESSION_PARAM}=${EXPIRED_SESSION_VALUE}`,
  );
}

export function readSession(): Session | null {
  const raw = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  return parseSessionCookie(raw);
}
