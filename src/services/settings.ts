import "server-only";
import { connectDB } from "@/db/mongoose";
import { Settings } from "@/models/Settings";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  await connectDB();
  const doc = await Settings.findOne({ key }).lean();
  return doc ? (doc.value as T) : fallback;
}

export async function setSetting(
  key: string,
  value: unknown,
  description?: string,
) {
  await connectDB();
  await Settings.updateOne(
    { key },
    { $set: description !== undefined ? { value, description } : { value } },
    { upsert: true },
  );
}

/** Convenience: is the Distributor role enabled? (SOW 1.2  off by default.) */
export function isDistributorEnabled(): Promise<boolean> {
  return getSetting<boolean>("distributor_enabled", false);
}
