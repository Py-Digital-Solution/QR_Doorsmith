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

/** Convenience feature toggles */
export function isDistributorEnabled(): Promise<boolean> {
  return getSetting<boolean>("distributor_enabled", false);
}

export function isDispatchEnabled(): Promise<boolean> {
  return getSetting<boolean>("dispatch_enabled", false);
}

export function isReturnsEnabled(): Promise<boolean> {
  return getSetting<boolean>("returns_enabled", false);
}

export function isRedemptionsEnabled(): Promise<boolean> {
  return getSetting<boolean>("redemptions_enabled", true);
}

export function isCounterRewardsEnabled(): Promise<boolean> {
  return getSetting<boolean>("counter_rewards_enabled", true);
}

export async function getFeatureSettings() {
  const [distributor, dispatch, returns, redemptions, counterRewards] = await Promise.all([
    isDistributorEnabled(),
    isDispatchEnabled(),
    isReturnsEnabled(),
    isRedemptionsEnabled(),
    isCounterRewardsEnabled(),
  ]);
  return {
    distributor_enabled: distributor,
    dispatch_enabled: dispatch,
    returns_enabled: returns,
    redemptions_enabled: redemptions,
    counter_rewards_enabled: counterRewards,
  };
}
