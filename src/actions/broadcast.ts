"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { createBroadcast, countAudience, sendTestMessage } from "@/services/broadcast";
import { logAudit } from "@/services/audit";

export type BroadcastActionState = { error?: string; ok?: boolean; id?: string; total?: number };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session.user;
}

export async function createBroadcastAction(
  _prev: BroadcastActionState,
  formData: FormData,
): Promise<BroadcastActionState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const roles = formData.getAll("roles").map(String);
  const message = String(formData.get("message") ?? "").trim();
  if (roles.length === 0) return { error: "Select at least one audience." };
  if (!message) return { error: "Message is required." };

  try {
    const { id, total } = await createBroadcast({
      roles,
      message,
      actorId: admin.id,
      actorName: admin.name ?? "",
    });
    logAudit({
      actorId: admin.id,
      actorRole: admin.role,
      actorName: admin.name ?? "",
      action: "broadcast_create",
      entityType: "broadcast",
      entityId: id,
      meta: { roles, total },
    });
    revalidatePath("/admin/promotions");
    return { ok: true, id, total };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create broadcast." };
  }
}

/** Send the composed message to the admin's own number as a test. */
export async function sendTestAction(
  _prev: BroadcastActionState,
  formData: FormData,
): Promise<BroadcastActionState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write a message first." };

  await connectDB();
  const me = await User.findById(admin.id).select("phone").lean();
  if (!me?.phone) return { error: "Your account has no phone number to test with." };

  try {
    await sendTestMessage(me.phone, message);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send test." };
  }
}

/** Live recipient count for the audience picker. */
export async function previewAudienceAction(roles: string[]): Promise<number> {
  const admin = await requireAdmin();
  if (!admin) return 0;
  return countAudience(roles);
}
