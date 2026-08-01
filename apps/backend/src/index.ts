import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma, prisma } from "./db/prisma.js";
import { createLinkRepository } from "./repositories/link.repository.js";
import { createRedisService } from "./services/redis.service.js";
import { createClickFlusher } from "./workers/click.flush.js";

const redis = createRedisService({ url: env.REDIS_URL });

void redis.connect();

const clickFlusher =
  env.CLICK_BUFFER_ENABLED && env.CLICK_FLUSH_ENABLED
    ? createClickFlusher({
        redis,
        repository: createLinkRepository(prisma),
        intervalMs: env.CLICK_FLUSH_INTERVAL_MS,
      })
    : undefined;

const app = createApp({
  redis,
  ...(clickFlusher !== undefined ? { clickFlusher } : {}),
});

const server = app.listen(env.PORT, () => {
  console.log(
    `[snipp] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );
  console.log(
    `[snipp] cache: ${
      env.CACHE_ENABLED
        ? `on (TTL ${env.CACHE_TTL_SECONDS}s, negative ${env.NEGATIVE_CACHE_TTL_SECONDS}s)`
        : "off (CACHE_ENABLED=false)"
    }`,
  );
  console.log(
    `[snipp] click flush: ${
      clickFlusher !== undefined
        ? `every ${String(env.CLICK_FLUSH_INTERVAL_MS)}ms`
        : "off"
    }`,
  );

  clickFlusher?.start();
});

const SHUTDOWN_TIMEOUT_MS = 15_000;

let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[snipp] received ${signal}, shutting down...`);

    const forceExit = setTimeout(() => {
      console.error("[snipp] shutdown timed out, exiting");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      void (async () => {
        await clickFlusher?.stop();
        await Promise.allSettled([disconnectPrisma(), redis.close()]);
        clearTimeout(forceExit);
        process.exit(0);
      })();
    });
  });
}
