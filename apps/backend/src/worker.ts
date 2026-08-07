import { env } from "./config/env.js";
import { disconnectPrisma, prisma } from "./db/prisma.js";
import { createLinkRepository } from "./repositories/link.repository.js";
import { createRedisService } from "./services/redis.service.js";
import { createClickFlusher } from "./workers/click.flush.js";

if (!env.CLICK_BUFFER_ENABLED) {
  console.error(
    "[snipp][worker] refusing to start: CLICK_BUFFER_ENABLED=false means " +
      "clicks are written straight to MySQL and there is nothing to flush",
  );
  process.exit(1);
}

const redis = createRedisService({ url: env.REDIS_URL });

void redis.connect();

const flusher = createClickFlusher({
  redis,
  repository: createLinkRepository(prisma),
  intervalMs: env.CLICK_FLUSH_INTERVAL_MS,
});

const keepAlive = setInterval(() => undefined, 1 << 30);

flusher.start();

console.log(
  `[snipp][worker] click flush every ${String(env.CLICK_FLUSH_INTERVAL_MS)}ms (${env.NODE_ENV})`,
);

const SHUTDOWN_TIMEOUT_MS = 15_000;

let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[snipp][worker] received ${signal}, draining buffer...`);

    const forceExit = setTimeout(() => {
      console.error("[snipp][worker] shutdown timed out, exiting");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    void (async () => {
      await flusher.stop();
      await Promise.allSettled([disconnectPrisma(), redis.close()]);
      clearInterval(keepAlive);
      clearTimeout(forceExit);
      process.exit(0);
    })();
  });
}
