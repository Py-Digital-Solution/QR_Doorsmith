import "server-only";
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
  // Allow public read of avatars so <img> can load them directly.
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${BUCKET}/avatars/*`],
      },
    ],
  });
  await client.setBucketPolicy(BUCKET, policy).catch(() => {});
}

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
  return `${env.S3_ENDPOINT!.replace(/\/$/, "")}/${BUCKET}/${key}`;
}
