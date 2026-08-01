import type { LinkRepository } from "../repositories/link.repository.js";
import type { ClickContext } from "../utils/clickContext.js";
import type { RedisService } from "./redis.service.js";

export const CLICK_COUNTS_KEY = "clicks:pending:counts";

export const CLICK_BUFFER_KEY = "clicks:pending:buffer";

export const MAX_BUFFERED_CLICKS = 50_000;

export interface BufferedClick {
  l: number;
  t: number;
  d: string;
  b: string;
  r: string;
}

export interface ClickBuffer {
  record(linkId: number, context: ClickContext): Promise<void>;
  pendingCount(): Promise<number>;
}

export interface ClickBufferDeps {
  redis: RedisService;
  fallbackRepository?: LinkRepository;
  logger?: Pick<Console, "error">;
  now?: () => number;
}

export function createClickBuffer(deps: ClickBufferDeps): ClickBuffer {
  const logger = deps.logger ?? console;
  const now = deps.now ?? (() => Date.now());

  return {
    async record(linkId, context) {
      const entry: BufferedClick = {
        l: linkId,
        t: now(),
        d: context.device,
        b: context.browser,
        r: context.referrer,
      };

      const written = await deps.redis.run(async (client) => {
        const results = await client
          .pipeline()
          .hincrby(CLICK_COUNTS_KEY, String(linkId), 1)
          .rpush(CLICK_BUFFER_KEY, JSON.stringify(entry))
          .ltrim(CLICK_BUFFER_KEY, -MAX_BUFFERED_CLICKS, -1)
          .exec();

        return results !== null && results.every(([error]) => error === null);
      }, false);

      if (written) return;

      const repository = deps.fallbackRepository;
      if (repository === undefined) return;

      try {
        await Promise.all([
          repository.incrementClickCount(linkId),
          repository.recordClick({
            linkId,
            device: context.device,
            browser: context.browser,
            referrer: context.referrer,
          }),
        ]);
      } catch (error) {
        logger.error("[snipp] click write failed (both Redis and MySQL):", error);
      }
    },

    async pendingCount() {
      return await deps.redis.run(
        (client) => client.llen(CLICK_BUFFER_KEY),
        -1,
      );
    },
  };
}
