import { Prisma, type PrismaClient } from "@prisma/client";
import type { Device } from "../utils/clickContext.js";

export interface CreateLinkData {
  shortCode: string;
  targetUrl: string;
  userId: number | null;
  expiresAt: Date | null;
}

export interface LinkRecord {
  id: number;
  shortCode: string;
  targetUrl: string;
  userId: number | null;
  expiresAt: Date | null;
  clickCount: number;
  createdAt: Date;
}

export interface RedirectTarget {
  id: number;
  targetUrl: string;
  expiresAt: Date | null;
}

export interface RecordClickData {
  linkId: number;
  device: Device;
  browser: string;
  referrer: string;
}

export interface DailyClickRow {
  date: string;
  clicks: number;
}

export interface BreakdownRow {
  label: string;
  clicks: number;
}

export interface StatsWindow {
  from: Date;
  to: Date;
}

export class DuplicateShortCodeError extends Error {
  constructor(readonly shortCode: string) {
    super(`short_code already exists: ${shortCode}`);
    this.name = "DuplicateShortCodeError";
  }
}

export interface LinkRepository {
  create(data: CreateLinkData): Promise<LinkRecord>;
  findRedirectTarget(shortCode: string): Promise<RedirectTarget | null>;
  incrementClickCount(id: number): Promise<void>;
  recordClick(data: RecordClickData): Promise<void>;

  listByUser(
    userId: number,
    offset: number,
    limit: number,
  ): Promise<LinkRecord[]>;
  countByUser(userId: number): Promise<number>;

  findByIdForUser(id: number, userId: number): Promise<LinkRecord | null>;

  deleteByIdForUser(id: number, userId: number): Promise<string | null>;

  countClicksInWindow(linkId: number, window: StatsWindow): Promise<number>;
  dailyClicks(linkId: number, window: StatsWindow): Promise<DailyClickRow[]>;
  breakdownBy(
    column: "referrer" | "device",
    linkId: number,
    window: StatsWindow,
  ): Promise<BreakdownRow[]>;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

export function createLinkRepository(client: PrismaClient): LinkRepository {
  return {
    async create(data) {
      try {
        return await client.link.create({
          data: {
            shortCode: data.shortCode,
            targetUrl: data.targetUrl,
            userId: data.userId,
            expiresAt: data.expiresAt,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DuplicateShortCodeError(data.shortCode);
        }
        throw error;
      }
    },

    async findRedirectTarget(shortCode) {
      const rows = await client.$queryRaw<
        { id: number; targetUrl: string; expiresAt: Date | null }[]
      >`
        SELECT id, target_url AS targetUrl, expires_at AS expiresAt
        FROM links
        WHERE short_code = ${shortCode}
        LIMIT 1
      `;

      return rows[0] ?? null;
    },

    async incrementClickCount(id) {
      await client.link.updateMany({
        where: { id },
        data: { clickCount: { increment: 1 } },
      });
    },

    async recordClick(data) {
      await client.click.create({
        data: {
          linkId: data.linkId,
          device: data.device,
          browser: data.browser,
          referrer: data.referrer,
        },
      });
    },

    async listByUser(userId, offset, limit) {
      return await client.link.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      });
    },

    async countByUser(userId) {
      return await client.link.count({ where: { userId } });
    },

    async findByIdForUser(id, userId) {
      return await client.link.findFirst({ where: { id, userId } });
    },

    async deleteByIdForUser(id, userId) {
      const existing = await client.link.findFirst({
        where: { id, userId },
        select: { shortCode: true },
      });
      if (existing === null) return null;

      const result = await client.link.deleteMany({ where: { id, userId } });
      return result.count > 0 ? existing.shortCode : null;
    },

    async countClicksInWindow(linkId, window) {
      return await client.click.count({
        where: {
          linkId,
          createdAt: { gte: window.from, lt: window.to },
        },
      });
    },

    async dailyClicks(linkId, window) {
      const rows = await client.$queryRaw<{ date: string; clicks: bigint }[]>`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS clicks
        FROM clicks
        WHERE link_id = ${linkId}
          AND created_at >= ${window.from}
          AND created_at < ${window.to}
        GROUP BY date
        ORDER BY date ASC
      `;

      return rows.map((row) => ({
        date: row.date,
        clicks: toNumber(row.clicks),
      }));
    },

    async breakdownBy(column, linkId, window) {
      const rows = await client.click.groupBy({
        by: [column],
        where: {
          linkId,
          createdAt: { gte: window.from, lt: window.to },
        },
        _count: { _all: true },
      });

      return rows
        .map((row) => ({
          label: row[column] ?? "Unknown",
          clicks: row._count._all,
        }))
        .sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
    },
  };
}
