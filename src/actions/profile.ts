"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateMyName, changeMyPassword, setMyPhoto } from "@/services/profile";
import { uploadAvatar } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

export async function updateNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };
  try {
    await updateMyName(session.user.id, String(formData.get("name") ?? ""));
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update name." };
  }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };
  try {
    await changeMyPassword(
      session.user.id,
      String(formData.get("current") ?? ""),
      String(formData.get("next") ?? ""),
    );
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to change password." };
  }
}

export async function uploadPhotoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5 MB." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const url = await uploadAvatar(session.user.id, buffer, file.type, ext);
    await setMyPhoto(session.user.id, url);
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}
