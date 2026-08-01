import type { Request, RequestHandler } from "express";
import { tooManyRequests } from "../errors/AppError.js";
import type { RedisService } from "../services/redis.service.js";

const SLIDING_WINDOW_SCRIPT = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]

-- Drop members that fell out of the window, so no separate cleanup job is needed.
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)

if count >= limit then
  -- Oldest member decides Retry-After: that is when a slot frees up.
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryMs = window
  if oldest[2] ~= nil then
    retryMs = (tonumber(oldest[2]) + window) - now
    if retryMs < 0 then retryMs = 0 end
  end
  return { 0, count, math.ceil(retryMs) }
end

redis.call('ZADD', key, now, member)

-- PEXPIRE after ZADD so the TTL always tracks the most recent request.
redis.call('PEXPIRE', key, window)

return { 1, count + 1, math.ceil(window) }
`;

export const SLIDING_WINDOW_COMMAND = "snippRateLimit";

export function registerRateLimitScript(redis: RedisService): void {
  redis.defineScript(SLIDING_WINDOW_COMMAND, 1, SLIDING_WINDOW_SCRIPT);
}

export interface RateLimitOptions {
  redis: RedisService;
  limit: number;
  windowMs: number;
  keyPrefix: string;
  identify?: (req: Request) => string;
  message?: string;
}

let memberCounter = 0;

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const identify = options.identify ?? ((req: Request) => req.ip ?? "unknown");
  const windowSeconds = Math.ceil(options.windowMs / 1000);

  return async (req, res, next) => {
    const key = `${options.keyPrefix}:${identify(req)}`;
    const now = Date.now();
    memberCounter = (memberCounter + 1) % Number.MAX_SAFE_INTEGER;

    const result = await options.redis.callScript<
      [number, number, number] | null
    >(
      SLIDING_WINDOW_COMMAND,
      [key, now, options.windowMs, options.limit, `${now}-${memberCounter}`],
      null,
    );

    if (result === null) {
      next();
      return;
    }

    const [allowed, count, retryMs] = result;
    const remaining = Math.max(0, options.limit - count);

    res.setHeader("X-RateLimit-Limit", String(options.limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil((now + retryMs) / 1000)),
    );

    if (allowed === 1) {
      next();
      return;
    }

    res.setHeader(
      "Retry-After",
      String(Math.max(1, Math.ceil(retryMs / 1000))),
    );

    next(
      tooManyRequests(
        options.message ??
          `Too many requests. Try again in ${Math.max(1, Math.ceil(retryMs / 1000))}s (limit: ${options.limit} per ${windowSeconds}s).`,
      ),
    );
  };
}
