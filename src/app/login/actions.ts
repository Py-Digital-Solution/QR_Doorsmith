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
    // `redirect: false` → set the session cookie but DON'T redirect from inside
    // the Server Action. A server-action redirect isn't reliably applied
    // client-side behind Netlify's runtime (cookie is set but the browser stays
    // on /login until a manual reload). The client navigates on `ok` instead.
    await signIn("staff", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
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
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid or expired code." };
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
