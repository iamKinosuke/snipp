const SHORT_DOMAIN =
  process.env.NEXT_PUBLIC_SHORT_DOMAIN ?? "http://localhost:4000";

export const SHORT_DOMAIN_LABEL = SHORT_DOMAIN.replace(
  /^https?:\/\//,
  "",
).replace(/\/$/, "");

export const MIN_PASSWORD_LENGTH = 8;
