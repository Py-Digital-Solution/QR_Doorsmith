"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSetting } from "@/services/settings";

export type BannerActionState = { error?: string; ok?: boolean };

export async function saveBannerAction(
  _prev: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };

  const image = String(formData.get("banner_image") ?? "");
  const enabled = formData.get("banner_enabled") === "on";

  try {
    await Promise.all([
      setSetting("banner_image", image, "Promotional banner image shown on the khati app."),
      setSetting("banner_enabled", enabled, "Whether the khati app banner is currently active."),
    ]);
    revalidatePath("/khati", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save banner." };
  }
}
