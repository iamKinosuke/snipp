import type { RequestHandler } from "express";
import {
  loginBodySchema,
  parseAuthBody,
  registerBodySchema,
} from "../schemas/auth.schema.js";
import type { AuthService } from "../services/auth.service.js";

export interface AuthControllerDeps {
  service: AuthService;
}

export function createAuthController(deps: AuthControllerDeps) {
  const register: RequestHandler = async (req, res) => {
    const body = parseAuthBody(registerBodySchema, req.body, {
      email: "INVALID_EMAIL",
      password: "WEAK_PASSWORD",
    });

    const session = await deps.service.register(body);
    res.status(201).json(session);
  };

  const login: RequestHandler = async (req, res) => {
    const body = parseAuthBody(loginBodySchema, req.body, {
      email: "INVALID_CREDENTIALS",
      password: "INVALID_CREDENTIALS",
    });

    const session = await deps.service.login(body);
    res.status(200).json(session);
  };

  return { register, login };
}
