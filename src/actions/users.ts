"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUser, updateUser, deleteUser } from "@/services/users";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/services/email";
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
  const email = String(formData.get("email") ?? "") || undefined;
  const password = String(formData.get("password") ?? "") || undefined;
  const name = String(formData.get("name") ?? "");
  let phone = String(formData.get("phone") ?? "") || undefined;

  // For staff with a phone: verify the Firebase ID token produced after OTP confirm
  if (role !== "khati" && phone) {
    const idToken = String(formData.get("firebaseIdToken") ?? "").trim();
    if (!idToken) {
      return { error: "Please verify the phone number via OTP before submitting." };
    }
    try {
      const decoded = await verifyFirebaseIdToken(idToken);
      // Use the Firebase-confirmed number as the authoritative phone value
      if (decoded.phone_number) phone = decoded.phone_number;
    } catch {
      return { error: "Phone verification failed or expired. Please re-verify." };
    }
  }

  try {
    await createUser({
      actorRole: session.user.role,
      actorId: session.user.id,
      role,
      name,
      email,
      password,
      phone,
    });

    // Send welcome email to staff accounts (non-fatal if SMTP not configured)
    if (role !== "khati" && email && password) {
      await sendWelcomeEmail({ to: email, name, role, password }).catch(() => {});
    }

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
