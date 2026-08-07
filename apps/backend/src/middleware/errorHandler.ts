import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import { isAppError, notFound } from "../errors/AppError.js";
import { renderErrorPage } from "../views/errorPage.js";

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ErrorHandlerOptions {
  includeDebugDetails: boolean;

  homeUrl: string;

  logger?: Pick<Console, "error">;
}

interface PageCopy {
  title: string;
  message: string;
}

const PAGE_COPY: Record<number, PageCopy> = {
  404: {
    title: "Link not found",
    message:
      "This short link does not exist. It may have been deleted, or the address was mistyped.",
  },
  410: {
    title: "Link expired",
    message: "This short link has expired and no longer forwards anywhere.",
  },
  429: {
    title: "Too many requests",
    message: "You have made a lot of requests. Please wait a moment and retry.",
  },
};

const FALLBACK_COPY: PageCopy = {
  title: "Something went wrong",
  message: "The link could not be resolved right now. Please try again later.",
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    notFound(
      req.path.startsWith("/api/")
        ? "Route not found."
        : "That link does not exist.",
    ),
  );
};

function prefersHtml(req: Request): boolean {
  if (req.path.startsWith("/api/")) return false;
  return req.accepts(["html", "json"]) === "html";
}

export function createErrorHandler(
  options: ErrorHandlerOptions,
): ErrorRequestHandler {
  const logger = options.logger ?? console;

  return (error, req, res, _next) => {
    const appError = isAppError(error) ? error : null;

    if (appError === null) {
      logger.error("[snipp] unhandled error:", error);
    }

    if (prefersHtml(req)) {
      const status = appError?.status ?? 500;
      const copy = PAGE_COPY[status] ?? FALLBACK_COPY;

      res
        .status(status)
        .type("html")
        .send(
          renderErrorPage({
            status,
            title: copy.title,
            message: copy.message,
            homeUrl: options.homeUrl,
          }),
        );
      return;
    }

    if (appError !== null) {
      const body: ErrorResponseBody = {
        error: { code: appError.code, message: appError.message },
      };
      if (appError.details !== undefined) {
        body.error.details = appError.details;
      }
      res.status(appError.status).json(body);
      return;
    }

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
