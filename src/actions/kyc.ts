"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { submitKhatiProfile, approveKyc, rejectKyc } from "@/services/kyc";
import { logAudit } from "@/services/audit";

export type KycActionState = { error?: string; ok?: boolean };

export async function submitRegistrationAction(
  _prev: KycActionState,
  formData: FormData,
): Promise<KycActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dob = String(formData.get("dob") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || undefined;

  if (!token) return { error: "Invalid registration link." };
  if (!address) return { error: "Address is required." };
  if (!dob) return { error: "Date of birth is required." };

  let photoData: { buffer: Buffer; contentType: string; ext: string } | undefined;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) return { error: "Photo must be under 5 MB." };
    try {
      const arrayBuf = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const contentType = photo.type || "image/jpeg";
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      photoData = { buffer, contentType, ext };
    } catch (err) {
      console.error("[kyc] Photo processing error:", err);
      return { error: "Failed to process photo. Please try again." };
    }
  }

  const result = await submitKhatiProfile(token, { address, dob, email, photoData });
  if ("error" in result) return { error: result.error };
  return { ok: true };
}

export async function approveKycAction(khatiId: string): Promise<KycActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };
  try {
    await approveKyc(session.user.id, session.user.role, khatiId);
    logAudit({ actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "", action: "kyc_approve", entityType: "user", entityId: khatiId });
    revalidatePath("/admin/kyc");
    revalidatePath("/approvals");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to approve." };
  }
}

export async function rejectKycAction(khatiId: string, reason: string): Promise<KycActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };
  try {
    await rejectKyc(session.user.id, session.user.role, khatiId, reason);
    logAudit({ actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "", action: "kyc_reject", entityType: "user", entityId: khatiId, meta: { reason } });
    revalidatePath("/admin/kyc");
    revalidatePath("/approvals");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reject." };
  }
}
