"use server";

import { safeError } from "@/lib/safe-error";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/products";
import type { ProductStatus } from "@/lib/product";

export type ActionState = { error?: string; ok?: boolean };

async function getAdminSession() {
  const session = await auth();
  return session?.user?.role === "admin" || session?.user?.role === "super_admin" ? session : null;
}

function parse(formData: FormData) {
  return {
    sku: String(formData.get("sku") ?? ""),
    name: String(formData.get("name") ?? ""),
    mrp: Number(formData.get("mrp") ?? 0),
    salesPrice: Number(formData.get("salesPrice") ?? 0),
    rewardPoints: Number(formData.get("rewardPoints") ?? 0),
    description: String(formData.get("description") ?? "") || undefined,
    videoLinks: formData
      .getAll("videoLinks")
      .map((v) => String(v).trim())
      .filter(Boolean),
    status: (String(formData.get("status") ?? "") || undefined) as
      | ProductStatus
      | undefined,
  };
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorized." };
  try {
    await createProduct({ ...parse(formData), orgId: session.user.orgId });
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to create product.") };
  }
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorized." };
  try {
    await updateProduct(String(formData.get("id") ?? ""), { ...parse(formData), orgId: session.user.orgId });
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to update product.") };
  }
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorized." };
  try {
    await deleteProduct(id, session.user.orgId);
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to delete product.") };
  }
}
