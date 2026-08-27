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
  const getNum = (key: string, name: string, fallback?: number) => {
    const raw = formData.get(key);
    if (raw === null || String(raw).trim() === "") {
      if (fallback !== undefined) return fallback;
      throw new Error(`${name} is required.`);
    }
    const val = Number(raw);
    if (!Number.isFinite(val) || val < 0) {
      throw new Error(`${name} must be a number ≥ 0.`);
    }
    return val;
  };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Product name is required.");

  return {
    sku: String(formData.get("sku") ?? "").trim(),
    name,
    mrp: getNum("mrp", "MRP", 0),
    salesPrice: getNum("salesPrice", "Sales Price", 0),
    rewardPoints: getNum("rewardPoints", "Karigar Points", 0),
    counterRewardPoints: getNum("counterRewardPoints", "Counter Points", 0),
    description: String(formData.get("description") ?? "").trim() || undefined,
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
