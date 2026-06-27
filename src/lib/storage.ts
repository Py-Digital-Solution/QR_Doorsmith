import "server-only";
import { Readable } from "stream";
import * as Minio from "minio";
import { env } from "@/lib/env";

const BUCKET = env.S3_BUCKET || "doorsmith";

function getClient(): Minio.Client {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    throw new Error("File storage is not configured (set S3_* env vars).");
  }
  const url = new URL(env.S3_ENDPOINT);
  return new Minio.Client({
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
    useSSL: url.protocol === "https:",
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
  });
}

async function ensureBucket(client: Minio.Client) {
  const exists = await client.bucketExists(BUCKET).catch(() => false);
  if (!exists) await client.makeBucket(BUCKET);
}

/**
 * Upload a file to MinIO and return the object key (not a URL).
 * The key is stored in the DB; the browser accesses it via /api/files/[key].
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const client = getClient();
  await ensureBucket(client);
  const key = `avatars/${userId}-${Date.now()}.${ext}`;
  await client.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

/** Stream an object from MinIO  used by the /api/files proxy route. */
export async function getObjectStream(
  key: string,
): Promise<{ stream: ReadableStream; contentType: string }> {
  const client = getClient();
  const [nodeStream, stat] = await Promise.all([
    client.getObject(BUCKET, key),
    client.statObject(BUCKET, key).catch(() => null),
  ]);
  const contentType =
    (stat?.metaData?.["content-type"] as string | undefined) ??
    "application/octet-stream";
  return { stream: Readable.toWeb(nodeStream) as ReadableStream, contentType };
}

/**
 * Direct, publicly-readable MinIO URL for an object key. The bucket policy
 * allows public GET on `avatars/*`, so this URL works for un-authenticated
 * recipients (e.g. a WhatsApp image link) — unlike the auth-gated /api/files
 * proxy. Only use for objects stored under a public prefix.
 */
export function publicObjectUrl(key: string): string {
  const base = (env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  return `${base}/${BUCKET}/${key}`;
}

/**
 * Convert whatever is stored in the DB (object key or legacy full URL) to a
 * browser-accessible proxy URL served through /api/files/[key].
 */
export function toPhotoUrl(stored: string | undefined | null): string {
  if (!stored) return "";
  // Legacy records store the full MinIO URL  extract just the key portion.
  if (stored.startsWith("http")) {
    try {
      const parts = new URL(stored).pathname.split("/").filter(Boolean);
      // pathname: /bucket/avatars/... → drop the bucket segment
      const key = parts.slice(1).join("/");
      return key ? `/api/files/${key}` : "";
    } catch {
      return "";
    }
  }
  return `/api/files/${stored}`;
}
