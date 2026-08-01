import { z } from "zod";
import { badRequest, notFound } from "../errors/AppError.js";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../services/link.service.js";

export const createLinkBodySchema = z.object({
  url: z.string({ error: "A URL is required." }).min(1, "A URL is required."),
  alias: z.string().trim().optional(),
  expiresAt: z.coerce
    .date({ error: "That expiry date is not valid." })
    .optional(),
});

export type CreateLinkBody = z.infer<typeof createLinkBodySchema>;

export function parseCreateLinkBody(body: unknown): CreateLinkBody {
  const result = createLinkBodySchema.safeParse(body);

  if (!result.success) {
    const first = result.error.issues[0];
    throw badRequest(
      first?.path[0] === "expiresAt" ? "INVALID_EXPIRY" : "INVALID_URL",
      first?.message ?? "The details you sent are not valid.",
      result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export function parsePagination(query: unknown): {
  page: number;
  pageSize: number;
} {
  const source = (query ?? {}) as Record<string, unknown>;

  return {
    page: toPositiveInt(source.page, 1),
    pageSize: Math.min(
      toPositiveInt(source.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    ),
  };
}

export const ALLOWED_STATS_DAYS = [7, 30] as const;

export function parseStatsDays(query: unknown): number {
  const source = (query ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(source.days) ? source.days[0] : source.days;
  const value = Number(raw);

  return ALLOWED_STATS_DAYS.find((allowed) => allowed === value) ?? ALLOWED_STATS_DAYS[0];
}

export function parseLinkId(raw: unknown): number {
  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw notFound("That link no longer exists.");
  }

  return value;
}

function toPositiveInt(raw: unknown, fallback: number): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) && value >= 1 ? value : fallback;
}
