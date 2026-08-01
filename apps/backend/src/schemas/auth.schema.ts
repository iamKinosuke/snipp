import { z } from "zod";
import { badRequest } from "../errors/AppError.js";

export const MIN_PASSWORD_LENGTH = 8;

const MAX_PASSWORD_LENGTH = 200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailSchema = z
  .string({ error: "An email is required." })
  .trim()
  .min(1, "An email is required.")
  .max(255, "That email is too long.")
  .regex(EMAIL_PATTERN, "That email is not valid.");

export const registerBodySchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "A password is required." })
    .min(
      MIN_PASSWORD_LENGTH,
      `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    )
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "A password is required." })
    .min(1, "A password is required.")
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;

export interface AuthErrorCodes {
  email: string;
  password: string;
}

export function parseAuthBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  codes: AuthErrorCodes,
): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const first = result.error.issues[0];
    const field = first?.path[0];

    const code =
      field === "email"
        ? codes.email
        : field === "password"
          ? codes.password
          : "VALIDATION_ERROR";

    throw badRequest(
      code,
      first?.message ?? "The details you entered are not valid.",
      result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }

  return result.data;
}
