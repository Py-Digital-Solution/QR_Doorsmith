"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSetting } from "@/services/settings";

export type BrandingState = { error?: string; ok?: boolean };

export async function saveBrandingAction(
  _prev: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Unauthorized" };

  const get = (k: string) => String(formData.get(k) ?? "").trim();

  await Promise.all([
    setSetting("company_name", get("company_name"), "Company display name"),
    setSetting("company_tagline", get("company_tagline"), "Company tagline / slogan"),
    setSetting("company_phone", get("company_phone"), "Company contact phone"),
    setSetting("company_email", get("company_email"), "Company email address"),
    setSetting("company_address", get("company_address"), "Company address"),
    setSetting("company_website", get("company_website"), "Company website URL"),
    setSetting("company_logo", get("company_logo"), "Company logo (base64 data URL)"),
  ]);

  revalidatePath("/admin/settings");
  return { ok: true };
}
