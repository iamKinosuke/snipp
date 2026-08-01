import type { RedirectTarget } from "../repositories/link.repository.js";
import type { RedisService } from "./redis.service.js";

export const DEFAULT_CACHE_TTL_SECONDS = 24 * 60 * 60;

export const NEGATIVE_CACHE_TTL_SECONDS = 60;

const KEY_PREFIX = "link:";

const NEGATIVE_MARKER = "0";

interface CachedTarget {
  i: number;
  u: string;
  e: number | null;
}

export type LinkCacheLookup =
  | { state: "miss" }
  | { state: "hit"; target: RedirectTarget }
  | { state: "negative" };

export interface LinkCacheMetrics {
  hits: number;
  misses: number;
  negativeHits: number;
}

export interface LinkCache {
  lookup(shortCode: string): Promise<LinkCacheLookup>;
  store(shortCode: string, target: RedirectTarget): Promise<void>;
  storeMissing(shortCode: string): Promise<void>;
  invalidate(shortCode: string): Promise<void>;
  metrics(): LinkCacheMetrics;
}

export interface LinkCacheDeps {
  redis: RedisService;
  ttlSeconds?: number;
  negativeTtlSeconds?: number;
  now?: () => Date;
}

export function createLinkCache(deps: LinkCacheDeps): LinkCache {
  const ttlSeconds = deps.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const negativeTtlSeconds =
    deps.negativeTtlSeconds ?? NEGATIVE_CACHE_TTL_SECONDS;
  const now = deps.now ?? (() => new Date());

  const counters: LinkCacheMetrics = { hits: 0, misses: 0, negativeHits: 0 };

  function keyFor(shortCode: string): string {
    return `${KEY_PREFIX}${shortCode}`;
  }

  function ttlFor(expiresAt: Date | null): number {
    if (expiresAt === null) return ttlSeconds;

    const remaining = Math.floor(
      (expiresAt.getTime() - now().getTime()) / 1000,
    );

    if (remaining <= 0) return negativeTtlSeconds;

    return Math.min(ttlSeconds, remaining);
  }

  return {
    async lookup(shortCode) {
      const raw = await deps.redis.run(
        (client) => client.get(keyFor(shortCode)),
        null,
      );

      if (raw === null) {
        counters.misses++;
        return { state: "miss" };
      }

      if (raw === NEGATIVE_MARKER) {
        counters.negativeHits++;
        return { state: "negative" };
      }

      let parsed: CachedTarget;
      try {
        parsed = JSON.parse(raw) as CachedTarget;
      } catch {
        counters.misses++;
        return { state: "miss" };
      }

      counters.hits++;
      return {
        state: "hit",
        target: {
          id: parsed.i,
          targetUrl: parsed.u,
          expiresAt: parsed.e === null ? null : new Date(parsed.e),
        },
      };
    },

    async store(shortCode, target) {
      const payload: CachedTarget = {
        i: target.id,
        u: target.targetUrl,
        e: target.expiresAt?.getTime() ?? null,
      };

      await deps.redis.run(
        (client) =>
          client.set(
            keyFor(shortCode),
            JSON.stringify(payload),
            "EX",
            ttlFor(target.expiresAt),
          ),
        null,
      );
    },

    async storeMissing(shortCode) {
      await deps.redis.run(
        (client) =>
          client.set(
            keyFor(shortCode),
            NEGATIVE_MARKER,
            "EX",
            negativeTtlSeconds,
          ),
        null,
      );
    },

    async invalidate(shortCode) {
      await deps.redis.run((client) => client.del(keyFor(shortCode)), 0);
    },

    metrics() {
      return { ...counters };
    },
  };
}

export function createNoopLinkCache(): LinkCache {
  return {
    async lookup() {
      return { state: "miss" };
    },
    async store() {},
    async storeMissing() {},
    async invalidate() {},
    metrics() {
      return { hits: 0, misses: 0, negativeHits: 0 };
    },
  };
}
