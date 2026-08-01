import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";
import { createRedisService } from "./services/redis.service.js";

const redis = createRedisService({ url: env.REDIS_URL });

void redis.connect();

const app = createApp({ redis });

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
});

let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[snipp] received ${signal}, shutting down...`);
    server.close(() => {
      void Promise.allSettled([disconnectPrisma(), redis.close()]).finally(() =>
        process.exit(0),
      );
    });
  });
}
