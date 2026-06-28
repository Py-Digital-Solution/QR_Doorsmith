"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { createBroadcast, countAudience, sendTestMessage } from "@/services/broadcast";
import { uploadPublicImage, publicObjectUrl } from "@/lib/storage";
import { logAudit } from "@/services/audit";

export type BroadcastActionState = { error?: string; ok?: boolean; id?: string; total?: number };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session.user;
}

const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Pull an optional `image` file off the form, upload it to public storage, and
 * return its public URL (the bridge attaches it as a WhatsApp image). Returns
 * undefined when no image was attached; throws on an invalid/oversized file.
 */
async function extractImageUrl(formData: FormData): Promise<string | undefined> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  const ext = IMAGE_EXT[file.type];
  if (!ext) throw new Error("Image must be PNG, JPEG, WebP, or GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 5 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await uploadPublicImage("promo", buffer, file.type, ext);
  return publicObjectUrl(key);
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
    const imageUrl = await extractImageUrl(formData);
    const { id, total } = await createBroadcast({
      roles,
      message,
      imageUrl,
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
    const imageUrl = await extractImageUrl(formData);
    await sendTestMessage(me.phone, message, imageUrl);
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
