import { Router, type RequestHandler } from "express";
import type { createLinkController } from "../controllers/link.controller.js";

type LinkController = ReturnType<typeof createLinkController>;

export interface LinkRouterDeps {
  controller: LinkController;
  optionalAuth: RequestHandler;
  requireAuth: RequestHandler;
  createRateLimit: RequestHandler;
}

export function createLinkRouter(deps: LinkRouterDeps): Router {
  const router = Router();

  router.post(
    "/",
    deps.createRateLimit,
    deps.optionalAuth,
    deps.controller.create,
  );

  router.get("/", deps.requireAuth, deps.controller.list);
  router.get("/:id/stats", deps.requireAuth, deps.controller.stats);
  router.delete("/:id", deps.requireAuth, deps.controller.remove);

  return router;
}

export function createRedirectRouter(controller: LinkController): Router {
  const router = Router();
  router.get("/:code", controller.redirect);
  return router;
}
