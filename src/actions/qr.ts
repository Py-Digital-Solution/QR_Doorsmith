"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  generateBatch,
  updateBatch,
  deleteBatch,
  updateQrCode,
  deleteQrCode,
} from "@/services/qr";
import { logAudit } from "@/services/audit";
import type { QrStatus } from "@/lib/qr";

export type ActionState = { error?: string; ok?: boolean; total?: number };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return session;
}

export async function updateBatchAction(
  batchId: string,
  input: {
    productId?: string;
    columns?: number;
    pageSize?: string;
  },
): Promise<{ error?: string; ok?: boolean }> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  try {
    await updateBatch(batchId, input);
    revalidatePath("/admin/qr");
    revalidatePath(`/admin/qr/${batchId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update batch." };
  }
}

export async function deleteBatchAction(
  batchId: string,
): Promise<{ error?: string; ok?: boolean }> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  try {
    await deleteBatch(batchId);
    revalidatePath("/admin/qr");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete batch." };
  }
}

export async function updateQrCodeAction(
  codeId: string,
  input: { status?: QrStatus; productId?: string },
  batchId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireAdmin();
  if (!session) return { error: "Not authorized." };
  try {
    await updateQrCode(codeId, { ...input, adminOverride: true });
    logAudit({
      actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "",
      action: "qr_code_edit", entityType: "qrCode", entityId: codeId, meta: { ...input },
    });
    revalidatePath(`/admin/qr/${batchId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update code." };
  }
}

export async function deleteQrCodeAction(
  codeId: string,
  batchId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireAdmin();
  if (!session) return { error: "Not authorized." };
  try {
    await deleteQrCode(codeId);
    logAudit({
      actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "",
      action: "qr_code_delete", entityType: "qrCode", entityId: codeId,
    });
    revalidatePath(`/admin/qr/${batchId}`);
    revalidatePath("/admin/qr");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete code." };
  }
}

export async function generateBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorized." };

  try {
    const productId = String(formData.get("productId") ?? "").trim();
    if (!productId) return { error: "Please select a product." };
    const res = await generateBatch({
      productId,
      createdBy: session.user.id,
      masterCount: Number(formData.get("masterCount") ?? 0),
      smallPerMaster: Number(formData.get("smallPerMaster") ?? 0),
      productPerSmall: Number(formData.get("productPerSmall") ?? 0),
      qrSizes: {
        masterSize: Number(formData.get("masterQrSize") ?? 0) || undefined,
        smallSize: Number(formData.get("smallQrSize") ?? 0) || undefined,
        productSize: Number(formData.get("productQrSize") ?? 0) || undefined,
      },
      sheetConfig: {
        columns: Number(formData.get("columns") ?? 0) || undefined,
        pageSize: String(formData.get("pageSize") ?? "").trim() || undefined,
      },
    });
    logAudit({
      actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "",
      action: "qr_batch_create", entityType: "qrBatch", meta: { total: res.total },
    });
    revalidatePath("/admin/qr");
    return { ok: true, total: res.total };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to generate batch." };
  }
}
