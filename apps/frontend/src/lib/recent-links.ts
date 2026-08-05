import type { CreatedLink } from "@/lib/api";

const STORAGE_KEY = "snipp:recent-links";

export const MAX_RECENT_LINKS = 5;

const EMPTY: CreatedLink[] = [];

let snapshot: CreatedLink[] = EMPTY;
let hydrated = false;

const listeners = new Set<() => void>();

function isCreatedLink(value: unknown): value is CreatedLink {
  if (typeof value !== "object" || value === null) return false;

  const link = value as Partial<CreatedLink>;
  return (
    typeof link.shortCode === "string" &&
    typeof link.shortUrl === "string" &&
    typeof link.targetUrl === "string" &&
    typeof link.createdAt === "string" &&
    (link.expiresAt === null || typeof link.expiresAt === "string")
  );
}

function isLive(link: CreatedLink, now: number): boolean {
  return link.expiresAt === null || new Date(link.expiresAt).getTime() > now;
}

function read(): CreatedLink[] {
  let raw: string | null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw === null) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const now = Date.now();
    return parsed
      .filter(isCreatedLink)
      .filter((link) => isLive(link, now))
      .slice(0, MAX_RECENT_LINKS);
  } catch {
    return EMPTY;
  }
}

function commit(links: CreatedLink[]): void {
  snapshot = links;
  hydrated = true;

  try {
    if (links.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    }
  } catch {
  }

  for (const listener of listeners) {
    listener();
  }
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;

  snapshot = read();
  hydrated = true;

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRecentLinks(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getRecentLinks(): CreatedLink[] {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }

  return snapshot;
}

export function getServerRecentLinks(): CreatedLink[] {
  return EMPTY;
}

export function rememberRecentLink(link: CreatedLink): void {
  commit(
    [
      link,
      ...getRecentLinks().filter(
        (candidate) => candidate.shortCode !== link.shortCode,
      ),
    ].slice(0, MAX_RECENT_LINKS),
  );
}

export function clearRecentLinks(): void {
  commit(EMPTY);
}
