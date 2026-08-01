export const SESSION_COOKIE = "snipp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  token: string;
  email: string;
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
