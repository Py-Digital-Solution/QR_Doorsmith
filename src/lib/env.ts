import { z } from "zod";

/**
 * Centralized, validated environment variables.
 * Required vars are checked at startup; optional ones belong to later phases
 * (WhatsApp, Firebase, MinIO) and stay optional until those features land.
 *
 * Set SKIP_ENV_VALIDATION=1 to bypass (used during lint/build in CI).
 */
const envSchema = z.object({
  // --- Database (Phase 0) ---
  // MongoDB on the Oracle VM, configured as a single-node replica set so that
  // multi-document transactions work. Include `?replicaSet=rs0` in the URI.
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // --- Auth (Phase 1) ---
  AUTH_SECRET: z.string().min(1).optional(),
  // Bootstrap first admin (used by `npm run db:create-admin`).
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  // OTP dev mode: log code to console instead of sending via Firebase/WhatsApp.
  OTP_DEV_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // --- File storage / MinIO (Phase 0/2, optional for now) ---
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  // --- WhatsApp Cloud API (Phase 8, optional for now) ---
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

  // --- WhatsApp Baileys microservice ---
  // URL of the whatsapp-service process running on the Oracle VM
  WA_SERVICE_URL: z.string().url().optional(),
  // Must match WA_SERVICE_SECRET in whatsapp-service/.env
  WA_SERVICE_SECRET: z.string().optional(),

  // --- Firebase SMS OTP (Phase 1, optional for now) ---
  FIREBASE_PROJECT_ID: z.string().optional(),

  // --- SMTP Email (welcome emails) ---
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const skip = process.env.SKIP_ENV_VALIDATION === "1";
const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !skip) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables. See .env.example.");
}

export const env = (
  parsed.success ? parsed.data : (process.env as unknown)
) as z.infer<typeof envSchema>;
