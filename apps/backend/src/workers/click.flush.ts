import type {
  ClickCountDelta,
  BufferedClickRow,
  LinkRepository,
} from "../repositories/link.repository.js";
import {
  CLICK_BUFFER_KEY,
  CLICK_COUNTS_KEY,
  MAX_BUFFERED_CLICKS,
  type BufferedClick,
} from "../services/click.buffer.js";
import type { RedisService } from "../services/redis.service.js";
import type { Device } from "../utils/clickContext.js";

export const CLICK_COUNTS_FLUSHING_KEY = "clicks:flushing:counts";
export const CLICK_BUFFER_FLUSHING_KEY = "clicks:flushing:buffer";

export const DEFAULT_FLUSH_INTERVAL_MS = 10_000;

const RESTORE_CHUNK_SIZE = 1_000;
const MAX_LABEL_LENGTH = 32;
const MAX_REFERRER_LENGTH = 255;

const DEVICES: ReadonlySet<string> = new Set<Device>([
  "Desktop",
  "Mobile",
  "Tablet",
]);

export interface FlushOutcome {
  counters: number;
  clicks: number;
  dropped: number;
  malformed: number;
  restored: boolean;
}

export interface ClickFlusherStats {
  intervalMs: number;
  flushes: number;
  clicksWritten: number;
  lastFlushAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export interface ClickFlusher {
  start(): void;
  stop(): Promise<void>;
  flushOnce(): Promise<FlushOutcome>;
  stats(): ClickFlusherStats;
}

export interface ClickFlusherDeps {
  redis: RedisService;
  repository: LinkRepository;
  intervalMs?: number;
  logger?: Pick<Console, "log" | "warn" | "error">;
  logEachFlush?: boolean;
}

function emptyOutcome(): FlushOutcome {
  return {
    counters: 0,
    clicks: 0,
    dropped: 0,
    malformed: 0,
    restored: false,
  };
}

function isEmpty(outcome: FlushOutcome): boolean {
  return (
    outcome.counters === 0 &&
    outcome.clicks === 0 &&
    outcome.dropped === 0 &&
    outcome.malformed === 0
  );
}

function parseCounts(raw: Record<string, string>): ClickCountDelta[] {
  const counts: ClickCountDelta[] = [];

  for (const [field, value] of Object.entries(raw)) {
    const linkId = Number(field);
    const delta = Number(value);

    if (!Number.isInteger(linkId) || linkId <= 0) continue;
    if (!Number.isFinite(delta) || delta <= 0) continue;

    counts.push({ linkId, delta: Math.trunc(delta) });
  }

  return counts;
}

function parseClick(raw: string): BufferedClickRow | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { l, t, d, b, r } = parsed as Partial<BufferedClick>;

  if (!Number.isInteger(l) || (l as number) <= 0) return null;

  const at = typeof t === "number" && Number.isFinite(t) ? new Date(t) : null;

  return {
    linkId: l as number,
    createdAt: at !== null && !Number.isNaN(at.getTime()) ? at : new Date(),
    device: typeof d === "string" && DEVICES.has(d) ? (d as Device) : "Desktop",
    browser:
      typeof b === "string" && b !== ""
        ? b.slice(0, MAX_LABEL_LENGTH)
        : "Unknown",
    referrer:
      typeof r === "string" && r !== ""
        ? r.slice(0, MAX_REFERRER_LENGTH)
        : "Direct",
  };
}

export function createClickFlusher(deps: ClickFlusherDeps): ClickFlusher {
  const logger = deps.logger ?? console;
  const intervalMs = deps.intervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  const logEachFlush = deps.logEachFlush ?? true;

  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<FlushOutcome> | null = null;

  let flushes = 0;
  let clicksWritten = 0;
  let lastFlushAt: string | null = null;
  let lastError: string | null = null;
  let consecutiveFailures = 0;

  async function readSnapshot(): Promise<{
    counts: Record<string, string>;
    entries: string[];
  } | null> {
    return await deps.redis.run(async (client) => {
      const [counts, entries] = await Promise.all([
        client.hgetall(CLICK_COUNTS_FLUSHING_KEY),
        client.lrange(CLICK_BUFFER_FLUSHING_KEY, 0, -1),
      ]);

      return { counts, entries };
    }, null);
  }

  async function discardSnapshot(): Promise<void> {
    await deps.redis.run(
      (client) =>
        client.del(CLICK_COUNTS_FLUSHING_KEY, CLICK_BUFFER_FLUSHING_KEY),
      0,
    );
  }

  async function restoreSnapshot(
    counts: Record<string, string>,
    entries: string[],
  ): Promise<boolean> {
    return await deps.redis.run(async (client) => {
      const pipeline = client.pipeline();

      for (const { linkId, delta } of parseCounts(counts)) {
        pipeline.hincrby(CLICK_COUNTS_KEY, String(linkId), delta);
      }

      const head = entries.slice(-MAX_BUFFERED_CLICKS);
      for (let end = head.length; end > 0; end -= RESTORE_CHUNK_SIZE) {
        const part = head.slice(Math.max(0, end - RESTORE_CHUNK_SIZE), end);
        pipeline.lpush(CLICK_BUFFER_KEY, ...[...part].reverse());
      }

      if (head.length > 0) {
        pipeline.ltrim(CLICK_BUFFER_KEY, -MAX_BUFFERED_CLICKS, -1);
      }

      pipeline.del(CLICK_COUNTS_FLUSHING_KEY, CLICK_BUFFER_FLUSHING_KEY);

      const results = await pipeline.exec();
      return results !== null && results.every(([error]) => error === null);
    }, false);
  }

  async function drain(): Promise<{
    outcome: FlushOutcome;
    cleared: boolean;
  }> {
    const outcome = emptyOutcome();

    const snapshot = await readSnapshot();
    if (snapshot === null) return { outcome, cleared: false };

    const hasCounts = Object.keys(snapshot.counts).length > 0;
    if (!hasCounts && snapshot.entries.length === 0) {
      await discardSnapshot();
      return { outcome, cleared: true };
    }

    const counts = parseCounts(snapshot.counts);
    const clicks: BufferedClickRow[] = [];

    for (const raw of snapshot.entries) {
      const click = parseClick(raw);
      if (click === null) {
        outcome.malformed += 1;
        continue;
      }
      clicks.push(click);
    }

    try {
      const result = await deps.repository.applyClickBatch({ counts, clicks });

      outcome.counters = result.countsApplied;
      outcome.clicks = result.clicksInserted;
      outcome.dropped = clicks.length - result.clicksInserted;

      await discardSnapshot();

      clicksWritten += result.clicksInserted;
      consecutiveFailures = 0;
      lastError = null;

      if (result.droppedLinkIds.length > 0) {
        logger.warn(
          `[snipp][flush] dropped clicks for ${String(result.droppedLinkIds.length)} deleted link(s)`,
        );
      }

      return { outcome, cleared: true };
    } catch (error) {
      consecutiveFailures += 1;
      lastError = error instanceof Error ? error.message : String(error);

      const restored = await restoreSnapshot(
        snapshot.counts,
        snapshot.entries,
      );
      outcome.restored = restored;

      logger.error(
        `[snipp][flush] MySQL write failed (attempt ${String(consecutiveFailures)}), ` +
          `${String(snapshot.entries.length)} clicks ${restored ? "returned to Redis" : "LEFT IN SNAPSHOT, will retry"}:`,
        error,
      );

      return { outcome, cleared: restored };
    }
  }

  async function runFlush(): Promise<FlushOutcome> {
    const total = emptyOutcome();

    function merge(outcome: FlushOutcome): void {
      total.counters += outcome.counters;
      total.clicks += outcome.clicks;
      total.dropped += outcome.dropped;
      total.malformed += outcome.malformed;
      total.restored = total.restored || outcome.restored;
    }

    const leftover = await drain();
    merge(leftover.outcome);
    if (!leftover.cleared) return total;

    const claimed = await deps.redis.run(async (client) => {
      const results = await client
        .multi()
        .rename(CLICK_COUNTS_KEY, CLICK_COUNTS_FLUSHING_KEY)
        .rename(CLICK_BUFFER_KEY, CLICK_BUFFER_FLUSHING_KEY)
        .exec();

      return results !== null && results.some(([error]) => error === null);
    }, false);

    if (claimed) merge((await drain()).outcome);

    if (!isEmpty(total)) {
      flushes += 1;
      lastFlushAt = new Date().toISOString();
    }

    return total;
  }

  async function flushOnce(): Promise<FlushOutcome> {
    if (inFlight !== null) return await inFlight;

    inFlight = runFlush().finally(() => {
      inFlight = null;
    });

    return await inFlight;
  }

  return {
    start() {
      if (timer !== null) return;

      timer = setInterval(() => {
        void flushOnce().then((outcome) => {
          if (isEmpty(outcome)) return;

          const lost =
            outcome.dropped > 0 || outcome.malformed > 0
              ? `${String(outcome.dropped)} dropped (deleted links) · ` +
                `${String(outcome.malformed)} malformed`
              : null;

          if (lost !== null) {
            logger.warn(`[snipp][flush] ${lost}`);
            return;
          }

          if (!logEachFlush) return;

          logger.log(
            `[snipp][flush] ${String(outcome.clicks)} clicks · ` +
              `${String(outcome.counters)} links`,
          );
        });
      }, intervalMs);

      timer.unref();
    },

    async stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }

      if (inFlight !== null) {
        await inFlight.catch(() => undefined);
      }

      const outcome = await flushOnce().catch((error: unknown) => {
        logger.error("[snipp][flush] shutdown flush failed:", error);
        return null;
      });

      if (outcome !== null && !isEmpty(outcome)) {
        logger.log(
          `[snipp][flush] final flush: ${String(outcome.clicks)} clicks`,
        );
      }
    },

    flushOnce,

    stats() {
      return {
        intervalMs,
        flushes,
        clicksWritten,
        lastFlushAt,
        lastError,
        consecutiveFailures,
      };
    },
  };
}
