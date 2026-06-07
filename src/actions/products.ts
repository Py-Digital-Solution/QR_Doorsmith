"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/products";
import type { ProductStatus } from "@/lib/product";

export type ActionState = { error?: string; ok?: boolean };

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  return session?.user?.role === "admin" ? session.user.id : null;
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
  if (!(await requireAdmin())) return { error: "Not authorized." };
  try {
    await createProduct(parse(formData));
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create product." };
  }
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  try {
    await updateProduct(String(formData.get("id") ?? ""), parse(formData));
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update product." };
  }
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  try {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete product." };
  }
}
