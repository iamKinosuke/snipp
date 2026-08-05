import type { RequestHandler } from "express";
import { sessionInvalid, unauthorized } from "../errors/AppError.js";
import type { UserRepository } from "../repositories/user.repository.js";
import { verifyToken } from "../utils/jwt.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface AuthDeps {
  secret: string;
  users: Pick<UserRepository, "existsById">;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (header === undefined) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || token === undefined) return null;

  const trimmed = token.trim();
  return trimmed === "" ? null : trimmed;
}

function resolveUser(header: string | undefined, secret: string): AuthenticatedUser | null {
  const token = extractBearerToken(header);
  if (token === null) return null;

  const payload = verifyToken(token, secret);
  if (payload === null) return null;

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) return null;

  return { id, email: payload.email };
}

export function requireAuth(deps: AuthDeps): RequestHandler {
  return async (req, _res, next) => {
    const user = resolveUser(req.headers.authorization, deps.secret);

    if (user === null) {
      next(unauthorized("You need to sign in to do that."));
      return;
    }

    if (!(await deps.users.existsById(user.id))) {
      next(sessionInvalid());
      return;
    }

    req.user = user;
    next();
  };
}

export function optionalAuth(deps: AuthDeps): RequestHandler {
  return async (req, _res, next) => {
    const user = resolveUser(req.headers.authorization, deps.secret);

    if (user === null) {
      next();
      return;
    }

    if (!(await deps.users.existsById(user.id))) {
      next(sessionInvalid());
      return;
    }

    req.user = user;
    next();
  };
}
