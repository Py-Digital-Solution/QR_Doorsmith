"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { createUser, updateUser, deleteUser } from "@/services/users";
import { logAudit } from "@/services/audit";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/services/email";
import { waSend } from "@/services/whatsapp";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import type { UserRole, UserStatus } from "@/models/User";

export type ActionState = { error?: string; ok?: boolean };

function revalidateAreas() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/dispatch"); // counter list in dispatch form updates
  revalidatePath("/sales");
  revalidatePath("/counter", "layout");
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

  const counterId = String(formData.get("counterId") ?? "").trim() || undefined;

  try {
    await createUser({
      actorRole: session.user.role,
      actorId: session.user.id,
      role,
      name,
      email,
      password,
      phone,
      counterId,
    });

    // Send welcome email to staff accounts (non-fatal if SMTP not configured)
    if (role !== "khati" && email && password) {
      await sendWelcomeEmail({ to: email, name, role, password }).catch(() => {});
    }

    logAudit({ actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "", action: "user_create", entityType: "user", meta: { role, name } });
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

export async function resendRegistrationLinkAction(userId: string): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "counter") {
    return { error: "Not authorized." };
  }
  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || user.role !== "khati") return { error: "Khati not found." };
    if (user.kycStatus === "approved") return { error: "This khati is already approved." };
    if (!user.phone) return { error: "No phone number on record." };

    // Reuse existing token or generate a fresh one
    let token = user.registrationToken;
    if (!token) {
      token = randomBytes(24).toString("base64url");
      user.registrationToken = token;
      await user.save();
    }

    const hdrs = await headers();
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
    const appUrl = `${proto}://${host}`;

    await waSend(
      user.phone,
      `🔗 *DoorSmith पंजीकरण लिंक | Registration Link*\n\nनमस्ते *${user.name}*, आपका DoorSmith पंजीकरण लिंक नीचे है:\nHi *${user.name}*, here is your DoorSmith registration link:\n\n${appUrl}/register/${token}\n\nअपना खाता सक्रिय करने के लिए पंजीकरण पूरा करें।\nPlease complete your registration to activate your account.`,
      "welcome",
    );

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resend link." };
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
    logAudit({ actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "", action: "user_delete", entityType: "user", entityId: id });
    revalidateAreas();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}
