"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createDispatch } from "@/services/dispatch";
import { logAudit } from "@/services/audit";

export type ActionState = {
  error?: string;
  ok?: boolean;
  billNo?: string;
  dispatchId?: string;
  total?: number;
};

export async function createDispatchAction(input: {
  counterId: string;
  serials: string[];
}): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };

  try {
    const res = await createDispatch({
      createdBy: session.user.id,
      counterId: input.counterId,
      serials: input.serials,
    });
    logAudit({
      actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "",
      action: "dispatch_create", entityType: "dispatch", entityId: res.dispatchId,
      meta: { counterId: input.counterId, billNo: res.billNo, totalCodes: res.totalCodes },
    });
    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/qr");
    revalidatePath("/counter", "layout"); // counter inventory + dispatch history update
    return {
      ok: true,
      billNo: res.billNo,
      dispatchId: res.dispatchId,
      total: res.totalCodes,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Dispatch failed." };
  }
}
