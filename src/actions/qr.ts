"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateBatch } from "@/services/qr";

export type ActionState = { error?: string; ok?: boolean; total?: number };

export async function generateBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };

  try {
    const res = await generateBatch({
      productId: String(formData.get("productId") ?? ""),
      createdBy: session.user.id,
      masterCount: Number(formData.get("masterCount") ?? 0),
      smallPerMaster: Number(formData.get("smallPerMaster") ?? 0),
      productPerSmall: Number(formData.get("productPerSmall") ?? 0),
      sheetConfig: {
        labelWidthMm: Number(formData.get("labelWidthMm") ?? 0) || undefined,
        labelHeightMm: Number(formData.get("labelHeightMm") ?? 0) || undefined,
        columns: Number(formData.get("columns") ?? 0) || undefined,
      },
    });
    revalidatePath("/admin/qr");
    return { ok: true, total: res.total };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to generate batch." };
  }
}
