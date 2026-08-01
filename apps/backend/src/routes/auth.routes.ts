import { Router, type RequestHandler } from "express";
import type { createAuthController } from "../controllers/auth.controller.js";

type AuthController = ReturnType<typeof createAuthController>;

export interface AuthRouterDeps {
  loginRateLimit: RequestHandler;
}

export function createAuthRouter(
  controller: AuthController,
  deps: AuthRouterDeps,
): Router {
  const router = Router();

  router.post("/register", deps.loginRateLimit, controller.register);
  router.post("/login", deps.loginRateLimit, controller.login);

  return router;
}
