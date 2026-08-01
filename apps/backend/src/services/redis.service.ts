import Redis from "ioredis";

export type RedisClient = Redis;

export interface RedisService {
  run<T>(
    operation: (client: RedisClient) => Promise<T>,
    fallback: T,
  ): Promise<T>;

  defineScript(name: string, numberOfKeys: number, lua: string): void;

  callScript<T>(
    name: string,
    args: readonly (string | number)[],
    fallback: T,
  ): Promise<T>;

  isReady(): boolean;

  connect(): Promise<void>;

  close(): Promise<void>;
}

export interface RedisServiceDeps {
  url: string;
  logger?: Pick<Console, "warn" | "error">;
  logIntervalMs?: number;
}

const DEFAULT_LOG_INTERVAL_MS = 10_000;

export function createRedisService(deps: RedisServiceDeps): RedisService {
  const logger = deps.logger ?? console;
  const logIntervalMs = deps.logIntervalMs ?? DEFAULT_LOG_INTERVAL_MS;

  const client = new Redis(deps.url, {
    lazyConnect: true,
    enableOfflineQueue: false,

    maxRetriesPerRequest: 1,
    connectTimeout: 1_000,

    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });

  const lastLoggedAt = new Map<string, number>();

  function logThrottled(kind: string, message: string, error?: unknown): void {
    const now = Date.now();
    const previous = lastLoggedAt.get(kind);
    if (previous !== undefined && now - previous < logIntervalMs) return;

    lastLoggedAt.set(kind, now);
    logger.warn(`[snipp][redis] ${message}`, error ?? "");
  }

  client.on("error", (error: unknown) => {
    logThrottled("connection", "connection error (still serving, falling back to MySQL):", error);
  });

  client.on("ready", () => {
    lastLoggedAt.delete("connection");
    console.log("[snipp][redis] ready");
  });

  function isReady(): boolean {
    return client.status === "ready";
  }

  async function run<T>(
    operation: (redis: RedisClient) => Promise<T>,
    fallback: T,
  ): Promise<T> {
    if (!isReady()) return fallback;

    try {
      return await operation(client);
    } catch (error) {
      logThrottled("command", "command failed, using fallback:", error);
      return fallback;
    }
  }

  return {
    run,

    defineScript(name, numberOfKeys, lua) {
      client.defineCommand(name, { numberOfKeys, lua });
    },

    async callScript(name, args, fallback) {
      return await run(async (redis) => {
        const command = (redis as unknown as Record<string, unknown>)[name];
        if (typeof command !== "function") {
          throw new Error(`Lua script not registered via defineScript: ${name}`);
        }
        return (await (command as (...a: unknown[]) => Promise<unknown>).call(
          redis,
          ...args,
        )) as typeof fallback;
      }, fallback);
    },

    isReady,

    async connect() {
      try {
        await client.connect();
      } catch (error) {
        logger.warn(
          "[snipp][redis] could not connect at boot — running degraded (every request goes straight to MySQL):",
          error,
        );
      }
    },

    async close() {
      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    },
  };
}
