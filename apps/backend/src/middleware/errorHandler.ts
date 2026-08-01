import type { ErrorRequestHandler, RequestHandler } from "express";
import { isAppError, notFound } from "../errors/AppError.js";

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ErrorHandlerOptions {
  includeDebugDetails: boolean;

  logger?: Pick<Console, "error">;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route not found."));
};

export function createErrorHandler(
  options: ErrorHandlerOptions,
): ErrorRequestHandler {
  const logger = options.logger ?? console;

  return (error, _req, res, _next) => {
    if (isAppError(error)) {
      const body: ErrorResponseBody = {
        error: { code: error.code, message: error.message },
      };
      if (error.details !== undefined) {
        body.error.details = error.details;
      }
      res.status(error.status).json(body);
      return;
    }

    logger.error("[snipp] unhandled error:", error);

    const body: ErrorResponseBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again later.",
      },
    };

    if (options.includeDebugDetails && error instanceof Error) {
      body.error.details = { name: error.name, message: error.message };
    }

    res.status(500).json(body);
  };
}
