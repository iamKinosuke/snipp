import type { LinkSummary } from "@/lib/api";

export interface LinkRow {
  link: LinkSummary;
  isExpired: boolean;
}

export function toLinkRows(items: readonly LinkSummary[]): LinkRow[] {
  const now = Date.now();

  return items.map((link) => ({
    link,
    isExpired:
      link.expiresAt !== null && new Date(link.expiresAt).getTime() < now,
  }));
}
