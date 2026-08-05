import { Prisma, type PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
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

export interface ClickCountDelta {
  linkId: number;
  delta: number;
}

export interface BufferedClickRow {
  linkId: number;
  createdAt: Date;
  device: Device;
  browser: string;
  referrer: string;
}

export interface ClickBatch {
  counts: ClickCountDelta[];
  clicks: BufferedClickRow[];
}

export interface ClickBatchResult {
  countsApplied: number;
  clicksInserted: number;
  droppedLinkIds: number[];
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

export type BreakdownDimension = "device" | "browser" | "referrer";

export class DuplicateShortCodeError extends Error {
  constructor(readonly shortCode: string) {
    super(`short_code already exists: ${shortCode}`);
    this.name = "DuplicateShortCodeError";
  }
}

export class UnknownUserError extends Error {
  constructor(readonly userId: number) {
    super(`user does not exist: ${userId}`);
    this.name = "UnknownUserError";
  }
}

export interface LinkRepository {
  create(data: CreateLinkData): Promise<LinkRecord>;
  findReusableByTarget(
    userId: number | null,
    targetUrl: string,
  ): Promise<LinkRecord | null>;
  findRedirectTarget(shortCode: string): Promise<RedirectTarget | null>;
  incrementClickCount(id: number): Promise<void>;
  recordClick(data: RecordClickData): Promise<void>;

  applyClickBatch(batch: ClickBatch): Promise<ClickBatchResult>;

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
    column: BreakdownDimension,
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

function hashTarget(targetUrl: string): string {
  return createHash("sha256").update(targetUrl).digest("hex");
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

const COUNT_CHUNK_SIZE = 500;
const CLICK_CHUNK_SIZE = 1_000;
const ROLLUP_CHUNK_SIZE = 500;

const CLICK_BATCH_TIMEOUT_MS = 30_000;

const TOTAL_DIMENSION = "total";
const TOTAL_VALUE = "";

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface RollupRow {
  linkId: number;
  dimension: string;
  date: string;
  value: string;
  clicks: number;
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rollUp(clicks: readonly BufferedClickRow[]): RollupRow[] {
  const rows = new Map<string, RollupRow>();

  function bump(
    linkId: number,
    dimension: string,
    date: string,
    value: string,
  ): void {
    const key = `${String(linkId)}|${dimension}|${date}|${value}`;
    const existing = rows.get(key);

    if (existing !== undefined) {
      existing.clicks += 1;
      return;
    }

    rows.set(key, { linkId, dimension, date, value, clicks: 1 });
  }

  for (const click of clicks) {
    const date = utcDateKey(click.createdAt);

    bump(click.linkId, TOTAL_DIMENSION, date, TOTAL_VALUE);
    bump(click.linkId, "device", date, click.device);
    bump(click.linkId, "browser", date, click.browser);
    bump(click.linkId, "referrer", date, click.referrer);
  }

  return [...rows.values()];
}

type RawExecutor = Pick<PrismaClient, "$executeRaw">;

async function upsertRollup(
  tx: RawExecutor,
  rows: readonly RollupRow[],
): Promise<void> {
  for (const part of chunk(rows, ROLLUP_CHUNK_SIZE)) {
    const values = Prisma.join(
      part.map(
        (row) =>
          Prisma.sql`(${row.linkId}, ${row.dimension}, ${row.date}, ${row.value}, ${row.clicks})`,
      ),
    );

    await tx.$executeRaw`
      INSERT INTO click_daily (link_id, dimension, date, value, clicks)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE clicks = clicks + VALUES(clicks)
    `;
  }
}

export function createLinkRepository(client: PrismaClient): LinkRepository {
  return {
    async create(data) {
      try {
        return await client.link.create({
          data: {
            shortCode: data.shortCode,
            targetUrl: data.targetUrl,
            targetHash: hashTarget(data.targetUrl),
            userId: data.userId,
            expiresAt: data.expiresAt,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DuplicateShortCodeError(data.shortCode);
        }
        if (data.userId !== null && isForeignKeyViolation(error)) {
          throw new UnknownUserError(data.userId);
        }
        throw error;
      }
    },

    async findReusableByTarget(userId, targetUrl) {
      return await client.link.findFirst({
        where: {
          userId,
          targetHash: hashTarget(targetUrl),
          targetUrl,
          expiresAt: null,
        },
        orderBy: { id: "desc" },
      });
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
      const createdAt = new Date();

      await client.$transaction(async (tx) => {
        await tx.click.create({
          data: {
            linkId: data.linkId,
            createdAt,
            device: data.device,
            browser: data.browser,
            referrer: data.referrer,
          },
        });

        await upsertRollup(tx, rollUp([{ ...data, createdAt }]));
      });
    },

    async applyClickBatch(batch) {
      const empty: ClickBatchResult = {
        countsApplied: 0,
        clicksInserted: 0,
        droppedLinkIds: [],
      };

      const referenced = new Set<number>();
      for (const entry of batch.counts) referenced.add(entry.linkId);
      for (const click of batch.clicks) referenced.add(click.linkId);
      if (referenced.size === 0) return empty;

      const alive = new Set(
        (
          await client.link.findMany({
            where: { id: { in: [...referenced] } },
            select: { id: true },
          })
        ).map((row) => row.id),
      );

      const droppedLinkIds = [...referenced].filter((id) => !alive.has(id));

      const counts = batch.counts.filter(
        (entry) => entry.delta > 0 && alive.has(entry.linkId),
      );
      const clicks = batch.clicks.filter((click) => alive.has(click.linkId));

      if (counts.length === 0 && clicks.length === 0) {
        return { ...empty, droppedLinkIds };
      }

      await client.$transaction(
        async (tx) => {
          for (const part of chunk(counts, COUNT_CHUNK_SIZE)) {
            const cases = Prisma.join(
              part.map(
                (entry) =>
                  Prisma.sql`WHEN ${entry.linkId} THEN click_count + ${entry.delta}`,
              ),
              " ",
            );
            const ids = Prisma.join(part.map((entry) => entry.linkId));

            await tx.$executeRaw`
              UPDATE links
              SET click_count = CASE id ${cases} ELSE click_count END
              WHERE id IN (${ids})
            `;
          }

          for (const part of chunk(clicks, CLICK_CHUNK_SIZE)) {
            await tx.click.createMany({ data: part });
          }

          await upsertRollup(tx, rollUp(clicks));
        },
        { timeout: CLICK_BATCH_TIMEOUT_MS },
      );

      return {
        countsApplied: counts.length,
        clicksInserted: clicks.length,
        droppedLinkIds,
      };
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
      const result = await client.clickDaily.aggregate({
        where: {
          linkId,
          dimension: TOTAL_DIMENSION,
          date: { gte: window.from, lt: window.to },
        },
        _sum: { clicks: true },
      });

      return result._sum.clicks ?? 0;
    },

    async dailyClicks(linkId, window) {
      const rows = await client.clickDaily.findMany({
        where: {
          linkId,
          dimension: TOTAL_DIMENSION,
          date: { gte: window.from, lt: window.to },
        },
        select: { date: true, clicks: true },
        orderBy: { date: "asc" },
      });

      return rows.map((row) => ({
        date: utcDateKey(row.date),
        clicks: row.clicks,
      }));
    },

    async breakdownBy(column, linkId, window) {
      const rows = await client.clickDaily.groupBy({
        by: ["value"],
        where: {
          linkId,
          dimension: column,
          date: { gte: window.from, lt: window.to },
        },
        _sum: { clicks: true },
      });

      return rows
        .map((row) => ({
          label: row.value,
          clicks: row._sum.clicks ?? 0,
        }))
        .sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
    },
  };
}
