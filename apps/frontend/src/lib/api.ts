import { ApiError, isApiErrorBody, isUnauthorized } from "@/lib/api-error";

export { ApiError, isUnauthorized };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CreatedLink {
  shortCode: string;
  shortUrl: string;
  targetUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateLinkPayload {
  url: string;
  alias?: string;
  expiresAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface CredentialsPayload {
  email: string;
  password: string;
}

export interface LinkSummary {
  id: string;
  shortCode: string;
  shortUrl: string;
  targetUrl: string;
  clickCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface LinksPage {
  items: LinkSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export const LINKS_PAGE_SIZE = 8;

export const STATS_RANGES = [7, 30] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface BreakdownItem {
  label: string;
  clicks: number;
}

export interface LinkStats {
  link: LinkSummary;
  totalClicks: number;
  range: StatsRange;
  rangeClicks: number;
  previousRangeClicks: number;
  daily: DailyClicks[];
  referrers: BreakdownItem[];
  devices: BreakdownItem[];
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "Could not reach the server. Check that the backend is running.",
      0,
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status);
    }
    throw new ApiError(
      "UNKNOWN_ERROR",
      `The server returned an error (${response.status}).`,
      response.status,
    );
  }

  return body as T;
}

export async function createLink(
  payload: CreateLinkPayload,
  token?: string,
): Promise<CreatedLink> {
  return request<CreatedLink>("/api/links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token !== undefined ? authHeaders(token) : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function listLinks(
  token: string,
  page = 1,
  pageSize = LINKS_PAGE_SIZE,
): Promise<LinksPage> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return request<LinksPage>(`/api/links?${query.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export async function getLinkStats(
  token: string,
  id: string,
  range: StatsRange,
): Promise<LinkStats> {
  return request<LinkStats>(`/api/links/${id}/stats?days=${range}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export async function deleteLink(token: string, id: string): Promise<void> {
  await request<null>(`/api/links/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function register(
  payload: CredentialsPayload,
): Promise<AuthSession> {
  return request<AuthSession>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function login(
  payload: CredentialsPayload,
): Promise<AuthSession> {
  return request<AuthSession>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
