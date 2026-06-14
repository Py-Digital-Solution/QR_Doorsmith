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

export async function setDistributorEnabledAction(
  enabled: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };
  try {
    await setSetting(
      "distributor_enabled",
      enabled,
      "SOW 1.2 — Distributor role on/off (admin controlled).",
    );
    revalidatePath("/admin/settings");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update setting." };
  }
}
