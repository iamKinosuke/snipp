export const SESSION_COOKIE = "snipp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  token: string;
  email: string;
}

export const EXPIRED_SESSION_PARAM = "session";
export const EXPIRED_SESSION_VALUE = "expired";

function decodeTokenExpiry(token: string): number | null {
  const segment = token.split(".")[1];
  if (segment === undefined) return null;

  try {
    const json: unknown = JSON.parse(
      atob(segment.replace(/-/g, "+").replace(/_/g, "/")),
    );

    if (
      typeof json === "object" &&
      json !== null &&
      typeof (json as { exp?: unknown }).exp === "number"
    ) {
      return (json as { exp: number }).exp;
    }
  } catch {
  }

  return null;
}

export function isSessionExpired(session: Session): boolean {
  const exp = decodeTokenExpiry(session.token);
  return exp === null || exp * 1000 <= Date.now();
}

export function parseSessionCookie(raw: string | undefined): Session | null {
  if (raw === undefined || raw === "") return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "token" in parsed &&
      "email" in parsed &&
      typeof (parsed as Session).token === "string" &&
      typeof (parsed as Session).email === "string"
    ) {
      return parsed as Session;
    }
  } catch {
  }

  return null;
}
