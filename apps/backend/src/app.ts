import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import { env, isProduction, trustProxySetting } from "./config/env.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createLinkController } from "./controllers/link.controller.js";
import { prisma } from "./db/prisma.js";
import { optionalAuth, requireAuth } from "./middleware/auth.js";
import {
  createErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { rateLimit, registerRateLimitScript } from "./middleware/rateLimit.js";
import { createLinkRepository } from "./repositories/link.repository.js";
import { createUserRepository } from "./repositories/user.repository.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import {
  createLinkRouter,
  createRedirectRouter,
} from "./routes/link.routes.js";
import { createAuthService } from "./services/auth.service.js";
import { createClickBuffer } from "./services/click.buffer.js";
import { createLinkCache, createNoopLinkCache } from "./services/link.cache.js";
import { createLinkService } from "./services/link.service.js";
import type { RedisService } from "./services/redis.service.js";
import type { ClickFlusher } from "./workers/click.flush.js";

export interface CreateAppDeps {
  redis?: RedisService;
  clickFlusher?: ClickFlusher;
}

export function createApp(deps: CreateAppDeps = {}): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));

  app.set("trust proxy", trustProxySetting());

  app.use(express.json({ limit: "10kb" }));

  const linkRepository = createLinkRepository(prisma);
  const userRepository = createUserRepository(prisma);

  const cache =
    deps.redis !== undefined && env.CACHE_ENABLED
      ? createLinkCache({
          redis: deps.redis,
          ttlSeconds: env.CACHE_TTL_SECONDS,
          negativeTtlSeconds: env.NEGATIVE_CACHE_TTL_SECONDS,
        })
      : createNoopLinkCache();

  const clickBuffer =
    deps.redis !== undefined && env.CLICK_BUFFER_ENABLED
      ? createClickBuffer({
          redis: deps.redis,
          fallbackRepository: linkRepository,
        })
      : undefined;

  const linkService = createLinkService({
    repository: linkRepository,
    shortDomain: env.SHORT_DOMAIN,
    blockedHosts: [new URL(env.SHORT_DOMAIN).hostname],
    cache,
    ...(clickBuffer !== undefined ? { clickBuffer } : {}),
  });
  const linkController = createLinkController({ service: linkService });

  const authService = createAuthService({
    repository: userRepository,
    jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
  });
  const authController = createAuthController({ service: authService });

  if (deps.redis !== undefined) {
    registerRateLimitScript(deps.redis);
  }

  const redis = deps.redis;
  const limiter = (options: {
    limit: number;
    windowMs: number;
    keyPrefix: string;
    message?: string;
  }): RequestHandler =>
    redis === undefined
      ? (_req, _res, next) => next()
      : rateLimit({ redis, ...options });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      env: env.NODE_ENV,
      uptime: Math.round(process.uptime()),
      redis: redis?.isReady() === true ? "ready" : "unavailable",
      cache: env.CACHE_ENABLED ? cache.metrics() : "disabled",
      clickPath: clickBuffer !== undefined ? "redis" : "mysql",
      clickFlush: deps.clickFlusher?.stats() ?? "disabled",
      ...linkController.metrics(),
    });
  });

  app.use(
    "/api/auth",
    createAuthRouter(authController, {
      loginRateLimit: limiter({
        limit: env.RATE_LIMIT_LOGIN_MAX,
        windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
        keyPrefix: "rl:login",
        message: "Too many sign-in attempts. Please wait before trying again.",
      }),
    }),
  );
  app.use(
    "/api/links",
    createLinkRouter({
      controller: linkController,
      optionalAuth: optionalAuth({
        secret: env.JWT_SECRET,
        users: userRepository,
      }),
      requireAuth: requireAuth({
        secret: env.JWT_SECRET,
        users: userRepository,
      }),
      createRateLimit: limiter({
        limit: env.RATE_LIMIT_CREATE_MAX,
        windowMs: env.RATE_LIMIT_CREATE_WINDOW_MS,
        keyPrefix: "rl:create",
        message: "You are creating links too quickly. Please slow down.",
      }),
    }),
  );

  app.use(createRedirectRouter(linkController));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ includeDebugDetails: !isProduction }));

  return app;
}
