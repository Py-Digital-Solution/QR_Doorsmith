"use server";

import { signOut } from "@/auth";

export async function signOutKhati() {
  await signOut({ redirectTo: "/login/khati" });
}

export async function signOutStaff() {
  await signOut({ redirectTo: "/login" });
}
