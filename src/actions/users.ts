"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUser, updateUser, deleteUser } from "@/services/users";
import type { UserRole, UserStatus } from "@/models/User";

export type ActionState = { error?: string; ok?: boolean };

function revalidateAreas() {
  revalidatePath("/admin/users");
  revalidatePath("/sales");
  revalidatePath("/counter");
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const role = String(formData.get("role") ?? "") as UserRole;

  try {
    await createUser({
      actorRole: session.user.role,
      actorId: session.user.id,
      role,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? "") || undefined,
      password: String(formData.get("password") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
    });

    revalidateAreas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create user." };
  }
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  try {
    await updateUser({
      actorRole: session.user.role,
      actorId: session.user.id,
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      status: (String(formData.get("status") ?? "") || undefined) as
        | UserStatus
        | undefined,
      email: String(formData.get("email") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      password: String(formData.get("password") ?? "") || undefined,
    });

    revalidateAreas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update user." };
  }
}

export async function deleteUserAction(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  try {
    await deleteUser({
      actorRole: session.user.role,
      actorId: session.user.id,
      id,
    });
    revalidateAreas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}
