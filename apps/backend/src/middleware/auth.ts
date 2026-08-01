import type { RequestHandler } from "express";
import { unauthorized } from "../errors/AppError.js";
import { verifyToken } from "../utils/jwt.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
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

export function requireAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const user = resolveUser(req.headers.authorization, secret);

    if (user === null) {
      next(unauthorized("You need to sign in to do that."));
      return;
    }

    req.user = user;
    next();
  };
}

export function optionalAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const user = resolveUser(req.headers.authorization, secret);
    if (user !== null) {
      req.user = user;
    }
    next();
  };
}
