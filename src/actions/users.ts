"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUser, updateUser, deleteUser } from "@/services/users";
import { requestOtp, verifyOtp } from "@/services/otp";
import { sendWelcomeEmail } from "@/services/email";
import type { UserRole, UserStatus } from "@/models/User";

export type ActionState = { error?: string; ok?: boolean; otpSent?: boolean };

function revalidateAreas() {
  revalidatePath("/admin/users");
  revalidatePath("/sales");
  revalidatePath("/counter");
}

export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Phone number is required." };

  try {
    await requestOtp(phone);
    return { otpSent: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send OTP." };
  }
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const role = String(formData.get("role") ?? "") as UserRole;
  const phone = String(formData.get("phone") ?? "") || undefined;
  const email = String(formData.get("email") ?? "") || undefined;
  const password = String(formData.get("password") ?? "") || undefined;
  const name = String(formData.get("name") ?? "");

  // For staff accounts with a phone, verify OTP before creating
  if (role !== "khati" && phone) {
    const otpCode = String(formData.get("otpCode") ?? "").trim();
    if (!otpCode) return { error: "Please enter the OTP sent to the phone number." };
    const valid = await verifyOtp(phone, otpCode);
    if (!valid) return { error: "Invalid or expired OTP. Please request a new one." };
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

    // Send welcome email to staff accounts
    if (role !== "khati" && email && password) {
      await sendWelcomeEmail({ to: email, name, role, password }).catch(() => {
        // Non-fatal: user is created even if email fails
      });
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
