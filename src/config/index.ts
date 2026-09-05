import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/pincode_db"),
  REDIS_URL: z.string().optional(),
  API_KEYS: z.string().default("pincode_dev_secret_key_12345").transform((val) =>
    val.split(",").map((k) => k.trim()).filter(Boolean)
  ),
  CACHE_TTL_SECONDS: z.string().default("86400").transform((val) => parseInt(val, 10)),
  CACHE_MAX_ITEMS: z.string().default("20000").transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default("1000").transform((val) => parseInt(val, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
