import "dotenv/config";
import { z } from "zod";

function booleanFromEnv(defaultValue: boolean) {
  return z
    .enum(["true", "false", "1", "0"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true" || value === "1");
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z
    .string()
    .min(1, "is required")
    .startsWith("mysql://", "must start with mysql://"),

  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),

  SHORT_DOMAIN: z.url().default("http://localhost:4000"),

  JWT_SECRET: z
    .string()
    .min(32, "must be at least 32 characters (use `openssl rand -base64 32`)"),

  JWT_EXPIRES_IN: z.string().default("7d"),

  CACHE_ENABLED: booleanFromEnv(true),

  CLICK_BUFFER_ENABLED: booleanFromEnv(true),

  CLICK_FLUSH_ENABLED: booleanFromEnv(true),

  CLICK_FLUSH_INTERVAL_MS: z.coerce.number().int().min(1_000).default(10_000),

  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(86_400),

  NEGATIVE_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),

  TRUST_PROXY: z.string().default("loopback"),

  RATE_LIMIT_CREATE_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_CREATE_WINDOW_MS: z.coerce.number().int().min(1).default(60_000),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().min(1).default(300_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("✗ Invalid environment configuration:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  console.error("\nSee apps/backend/.env.example\n");
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";

export function trustProxySetting(): boolean | number | string {
  const raw = env.TRUST_PROXY.trim();

  if (raw === "false") return false;
  if (raw === "true") return true;

  const hops = Number(raw);
  if (Number.isInteger(hops) && hops >= 0) return hops;

  return raw;
}
