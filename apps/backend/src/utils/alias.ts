import { SHORT_CODE_LENGTH } from "./base62.js";

export const MIN_ALIAS_LENGTH = 3;
export const MAX_ALIAS_LENGTH = 32;

const ALIAS_PATTERN = /^[0-9a-zA-Z_-]+$/;

export const RESERVED_CODES: ReadonlySet<string> = new Set([
  "api",
  "app",
  "_next",
  "health",
  "dashboard",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "settings",
  "account",
  "profile",
  "links",
  "stats",
  "analytics",
  "about",
  "admin",
  "help",
  "support",
  "contact",
  "pricing",
  "terms",
  "privacy",
  "docs",
  "status",
  "blog",
  "static",
  "public",
  "assets",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  ".well-known",
]);

export type AliasRejectionCode = "INVALID_ALIAS";

export type AliasValidationResult =
  | { ok: true; alias: string }
  | { ok: false; code: AliasRejectionCode; message: string };

const ALIAS_FORMAT_MESSAGE =
  `Aliases may only contain letters, numbers, hyphens and underscores, ` +
  `and must be ${MIN_ALIAS_LENGTH}–${MAX_ALIAS_LENGTH} characters long.`;

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase());
}

export function validateAlias(input: string): AliasValidationResult {
  const alias = input.trim();

  if (
    alias.length < MIN_ALIAS_LENGTH ||
    alias.length > MAX_ALIAS_LENGTH ||
    !ALIAS_PATTERN.test(alias)
  ) {
    return { ok: false, code: "INVALID_ALIAS", message: ALIAS_FORMAT_MESSAGE };
  }

  if (isReservedCode(alias)) {
    return {
      ok: false,
      code: "INVALID_ALIAS",
      message: `The alias "${alias}" is reserved. Please pick another one.`,
    };
  }

  return { ok: true, alias };
}

export function collidesWithGeneratedSpace(alias: string): boolean {
  return alias.length === SHORT_CODE_LENGTH && /^[0-9a-zA-Z]+$/.test(alias);
}
