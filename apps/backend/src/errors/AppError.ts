export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export const badRequest = (
  code: string,
  message: string,
  details?: unknown,
): AppError => new AppError(400, code, message, details);

export const unauthorized = (
  message = "You need to sign in to do that.",
): AppError => new AppError(401, "UNAUTHORIZED", message);

export const sessionInvalid = (
  message = "Your session is no longer valid. Please sign in again.",
): AppError => new AppError(401, "SESSION_INVALID", message);

export const forbidden = (
  message = "You do not have access to this resource.",
): AppError => new AppError(403, "FORBIDDEN", message);

export const notFound = (
  message = "Not found.",
): AppError => new AppError(404, "NOT_FOUND", message);

export const conflict = (code: string, message: string): AppError =>
  new AppError(409, code, message);

export const gone = (
  message = "That link has expired.",
): AppError => new AppError(410, "GONE", message);

export const tooManyRequests = (
  message = "Too many requests. Please try again shortly.",
): AppError => new AppError(429, "TOO_MANY_REQUESTS", message);
