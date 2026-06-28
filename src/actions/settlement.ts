"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { settleCounter } from "@/services/settlement";

export async function settleCounterAction(
  counterId: string,
  note?: string,
): Promise<{ error?: string; ok?: boolean; points?: number; count?: number }> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };
  if (!counterId) return { error: "Missing counter." };

  try {
    const res = await settleCounter(
      counterId,
      session.user.id,
      session.user.name ?? "",
      session.user.role,
      note,
    );
    revalidatePath("/admin/settlements");
    return { ok: true, points: res.points, count: res.count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to settle." };
  }
}
