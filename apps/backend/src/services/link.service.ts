import {
  AppError,
  badRequest,
  conflict,
  gone,
  notFound,
  sessionInvalid,
} from "../errors/AppError.js";
import {
  DuplicateShortCodeError,
  UnknownUserError,
  type BreakdownRow,
  type DailyClickRow,
  type LinkRecord,
  type LinkRepository,
  type RedirectTarget,
  type StatsWindow,
} from "../repositories/link.repository.js";
import { validateAlias } from "../utils/alias.js";
import { generateShortCode } from "../utils/base62.js";
import type { ClickContext } from "../utils/clickContext.js";
import { validateUrl } from "../utils/validateUrl.js";
import type { ClickBuffer } from "./click.buffer.js";
import { createNoopLinkCache, type LinkCache } from "./link.cache.js";

export const MAX_CODE_GENERATION_ATTEMPTS = 5;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CreateLinkInput {
  url: string;
  alias?: string | undefined;
  expiresAt?: Date | undefined;
  userId?: number | null | undefined;
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

export interface CreatedLink {
  shortCode: string;
  shortUrl: string;
  targetUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface LinksPage {
  items: LinkSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface LinkStats {
  link: LinkSummary;
  totalClicks: number;
  range: number;
  rangeClicks: number;
  previousRangeClicks: number;
  daily: DailyClicks[];
  referrers: BreakdownRow[];
  devices: BreakdownRow[];
}

export interface LinkServiceDeps {
  repository: LinkRepository;
  shortDomain: string;
  blockedHosts?: readonly string[];
  now?: () => Date;
  cache?: LinkCache;
  clickBuffer?: ClickBuffer;
}

export interface LinkService {
  createLink(input: CreateLinkInput): Promise<CreatedLink>;
  resolveForRedirect(shortCode: string): Promise<RedirectTarget>;
  recordClick(linkId: number, context: ClickContext): Promise<void>;
  listLinks(userId: number, page: number, pageSize: number): Promise<LinksPage>;
  deleteLink(id: number, userId: number): Promise<void>;
  getStats(id: number, userId: number, days: number): Promise<LinkStats>;
}

export function createLinkService(deps: LinkServiceDeps): LinkService {
  const now = deps.now ?? (() => new Date());
  const blockedHosts = deps.blockedHosts ?? [];
  const cache = deps.cache ?? createNoopLinkCache();

  function shortUrlFor(shortCode: string): string {
    return `${deps.shortDomain}/${shortCode}`;
  }

  function toSummary(link: LinkRecord): LinkSummary {
    return {
      id: String(link.id),
      shortCode: link.shortCode,
      shortUrl: shortUrlFor(link.shortCode),
      targetUrl: link.targetUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
  }

  return {
    async createLink(input) {
      const urlResult = validateUrl(input.url, { blockedHosts });
      if (!urlResult.ok) {
        throw badRequest(urlResult.code, urlResult.message);
      }

      let expiresAt: Date | null = null;
      if (input.expiresAt !== undefined) {
        if (Number.isNaN(input.expiresAt.getTime())) {
          throw badRequest("INVALID_EXPIRY", "That expiry date is not valid.");
        }
        if (input.expiresAt.getTime() <= now().getTime()) {
          throw badRequest(
            "INVALID_EXPIRY",
            "The expiry date must be in the future.",
          );
        }
        expiresAt = input.expiresAt;
      }

      const userId = input.userId ?? null;
      const targetUrl = urlResult.url;

      if (input.alias !== undefined) {
        const aliasResult = validateAlias(input.alias);
        if (!aliasResult.ok) {
          throw badRequest(aliasResult.code, aliasResult.message);
        }

        try {
          const link = await deps.repository.create({
            shortCode: aliasResult.alias,
            targetUrl,
            userId,
            expiresAt,
          });
          return await toCreated(link);
        } catch (error) {
          if (error instanceof DuplicateShortCodeError) {
            throw conflict(
              "ALIAS_TAKEN",
              `The alias "${aliasResult.alias}" is already taken. Try another one.`,
            );
          }
          if (error instanceof UnknownUserError) {
            throw sessionInvalid();
          }
          throw error;
        }
      }

      for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
        try {
          const link = await deps.repository.create({
            shortCode: generateShortCode(),
            targetUrl,
            userId,
            expiresAt,
          });
          return await toCreated(link);
        } catch (error) {
          if (error instanceof DuplicateShortCodeError) {
            continue;
          }
          if (error instanceof UnknownUserError) {
            throw sessionInvalid();
          }
          throw error;
        }
      }

      throw new AppError(
        503,
        "CODE_GENERATION_FAILED",
        "Could not generate a short code. Please try again.",
      );

      async function toCreated(link: LinkRecord): Promise<CreatedLink> {
        await cache.invalidate(link.shortCode);

        const summary = toSummary(link);
        return {
          shortCode: summary.shortCode,
          shortUrl: summary.shortUrl,
          targetUrl: summary.targetUrl,
          expiresAt: summary.expiresAt,
          createdAt: summary.createdAt,
        };
      }
    },

    async resolveForRedirect(shortCode) {
      const cached = await cache.lookup(shortCode);

      if (cached.state === "negative") {
        throw notFound("That link does not exist.");
      }

      let target = cached.state === "hit" ? cached.target : null;

      if (target === null) {
        target = await deps.repository.findRedirectTarget(shortCode);

        if (target === null) {
          await cache.storeMissing(shortCode);
          throw notFound("That link does not exist.");
        }

        await cache.store(shortCode, target);
      }

      if (target.expiresAt !== null && target.expiresAt.getTime() <= now().getTime()) {
        throw gone("That link has expired.");
      }

      return target;
    },

    async recordClick(linkId, context) {
      if (deps.clickBuffer !== undefined) {
        await deps.clickBuffer.record(linkId, context);
        return;
      }

      await Promise.all([
        deps.repository.incrementClickCount(linkId),
        deps.repository.recordClick({
          linkId,
          device: context.device,
          browser: context.browser,
          referrer: context.referrer,
        }),
      ]);
    },

    async listLinks(userId, page, pageSize) {
      const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
      const safePageSize =
        Number.isInteger(pageSize) && pageSize >= 1
          ? Math.min(pageSize, MAX_PAGE_SIZE)
          : DEFAULT_PAGE_SIZE;

      const [items, total] = await Promise.all([
        deps.repository.listByUser(
          userId,
          (safePage - 1) * safePageSize,
          safePageSize,
        ),
        deps.repository.countByUser(userId),
      ]);

      return {
        items: items.map(toSummary),
        total,
        page: safePage,
        pageSize: safePageSize,
      };
    },

    async deleteLink(id, userId) {
      const deletedShortCode = await deps.repository.deleteByIdForUser(
        id,
        userId,
      );

      if (deletedShortCode === null) {
        throw notFound("That link no longer exists.");
      }

      await cache.invalidate(deletedShortCode);
    },

    async getStats(id, userId, days) {
      const link = await deps.repository.findByIdForUser(id, userId);
      if (link === null) {
        throw notFound("That link no longer exists.");
      }

      const todayStart = startOfUtcDay(now());
      const to = new Date(todayStart.getTime() + DAY_MS);
      const from = new Date(to.getTime() - days * DAY_MS);
      const previous: StatsWindow = {
        from: new Date(from.getTime() - days * DAY_MS),
        to: from,
      };
      const current: StatsWindow = { from, to };

      const [rangeClicks, previousRangeClicks, dailyRows, referrers, devices] =
        await Promise.all([
          deps.repository.countClicksInWindow(id, current),
          deps.repository.countClicksInWindow(id, previous),
          deps.repository.dailyClicks(id, current),
          deps.repository.breakdownBy("referrer", id, current),
          deps.repository.breakdownBy("device", id, current),
        ]);

      return {
        link: toSummary(link),
        totalClicks: link.clickCount,
        range: days,
        rangeClicks,
        previousRangeClicks,
        daily: fillMissingDays(dailyRows, from, days),
        referrers,
        devices,
      };
    },
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fillMissingDays(
  rows: readonly DailyClickRow[],
  from: Date,
  days: number,
): DailyClicks[] {
  const byDate = new Map(rows.map((row) => [row.date, row.clicks]));

  return Array.from({ length: days }, (_, index) => {
    const date = toDateKey(new Date(from.getTime() + index * DAY_MS));
    return { date, clicks: byDate.get(date) ?? 0 };
  });
}
