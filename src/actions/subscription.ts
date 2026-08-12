"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { Subscription } from "@/models/Subscription";
import { safeError } from "@/lib/safe-error";

export type ActionState = { error?: string; ok?: boolean };

export async function upsertSubscriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  const orgId = String(formData.get("orgId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "free").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const maxUsers = Number(formData.get("maxUsers") ?? 50);
  const maxQrCodes = Number(formData.get("maxQrCodes") ?? 5000);
  const maxProducts = Number(formData.get("maxProducts") ?? 100);
  const expiresAtStr = String(formData.get("expiresAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!orgId) return { error: "Organisation ID required." };

  const validPlans = ["free", "starter", "pro", "enterprise"];
  const validStatuses = ["active", "suspended", "cancelled"];
  if (!validPlans.includes(plan)) return { error: "Invalid plan." };
  if (!validStatuses.includes(status)) return { error: "Invalid status." };

  try {
    await connectDB();
    await Subscription.findOneAndUpdate(
      { orgId },
      {
        $set: {
          plan,
          status,
          maxUsers: isNaN(maxUsers) ? 50 : maxUsers,
          maxQrCodes: isNaN(maxQrCodes) ? 5000 : maxQrCodes,
          maxProducts: isNaN(maxProducts) ? 100 : maxProducts,
          expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
          notes,
        },
      },
      { upsert: true, new: true },
    );
    revalidatePath("/super-admin/subscriptions");
    revalidatePath("/super-admin/organizations");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to update subscription.") };
  }
}
