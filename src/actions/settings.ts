"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSetting } from "@/services/settings";

export type ActionState = { error?: string; ok?: boolean };

export async function setNotificationEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };
  const email = String(formData.get("notification_email") ?? "").trim();
  try {
    await setSetting("notification_email", email, "Admin email for WhatsApp failure alerts.");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save email." };
  }
}

export async function setFeatureToggleAction(
  key: string,
  enabled: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "super_admin") {
    return { error: "Not authorized." };
  }
  const allowedKeys = [
    "distributor_enabled",
    "dispatch_enabled",
    "returns_enabled",
    "redemptions_enabled",
    "counter_rewards_enabled",
  ];
  if (!allowedKeys.includes(key)) {
    return { error: "Invalid setting key." };
  }
  try {
    await setSetting(key, enabled, `Feature toggle: ${key}`);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/counter");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update setting." };
  }
}

export async function setDistributorEnabledAction(
  enabled: boolean,
): Promise<ActionState> {
  return setFeatureToggleAction("distributor_enabled", enabled);
}
