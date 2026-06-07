"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { requestOtp } from "@/services/otp";

export type ActionState = { error?: string; ok?: boolean };

export async function staffLogin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await signIn("staff", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error; // re-throw the NEXT_REDIRECT
  }
}

export async function sendKhatiOtp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) return { error: "Enter your phone number." };
  await requestOtp(phone);
  return { ok: true };
}

export async function khatiLogin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await signIn("khati-otp", {
      phone: String(formData.get("phone") ?? ""),
      code: String(formData.get("code") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid or expired code." };
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
