"use server";

import { safeError } from "@/lib/safe-error";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { QrBatch } from "@/models/QrBatch";
import { QrCode } from "@/models/QrCode";
import { Dispatch } from "@/models/Dispatch";
import { PointTransaction } from "@/models/PointTransaction";
import { Return } from "@/models/Return";
import { createOrgSchema, createOrgAdminSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/password";
import { Sequence } from "@/models/Sequence";

export type ActionState = { error?: string; ok?: boolean };

// Gap-free displayId helper (modified from src/services/users.ts)
async function nextDisplayId(role: string): Promise<string> {
  const prefix = "AD";
  let candidate = "";
  do {
    const seq = await Sequence.findByIdAndUpdate(
      `user_id_${role}`,
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    );
    candidate = `${prefix}-${String(seq!.value).padStart(4, "0")}`;
  } while (await User.exists({ displayId: candidate }));

  return candidate;
}

export async function createOrganizationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied. Only Super Admins can perform this action." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  const parsed = createOrgSchema.safeParse({ name, slug });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await connectDB();
    const existing = await Organization.findOne({ slug });
    if (existing) {
      return { error: "An organization with this slug already exists." };
    }

    await Organization.create({ name, slug, status: "active" });

    // Auto-create a free subscription for the new org
    const { Subscription } = await import("@/models/Subscription");
    const newOrg = await Organization.findOne({ slug });
    if (newOrg) {
      await Subscription.create({ orgId: newOrg._id, plan: "free", status: "active" });
    }

    revalidatePath("/super-admin/organizations");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to create organization.") };
  }
}

export async function toggleOrganizationStatusAction(
  orgId: string
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  try {
    await connectDB();
    const org = await Organization.findById(orgId);
    if (!org) return { error: "Organization not found." };

    org.status = org.status === "active" ? "suspended" : "active";
    await org.save();

    // Also suspend/activate all users under this organization
    await User.updateMany({ orgId }, { $set: { status: org.status } });

    revalidatePath("/super-admin/organizations");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to update organization status.") };
  }
}

export async function createOrgAdminAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();

  const parsed = createOrgAdminSchema.safeParse({ name, email, password, orgId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return { error: "A user with this email already exists." };
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return { error: "Selected organization not found." };
    }

    const passwordHash = await hashPassword(password);
    const displayId = await nextDisplayId("admin");

    await User.create({
      role: "admin",
      name,
      email,
      passwordHash,
      orgId,
      status: org.status === "active" ? "active" : "suspended",
      displayId,
    });

    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to create Admin.") };
  }
}

export async function updateOrganizationAction(
  orgId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  if (!name || !slug) {
    return { error: "Name and Slug are required." };
  }

  if (!/^[a-z0-9-]{2,64}$/.test(slug)) {
    return { error: "Slug must be 2-64 characters using only lowercase letters, numbers, and hyphens." };
  }

  try {
    await connectDB();
    const existing = await Organization.findOne({ slug, _id: { $ne: orgId } });
    if (existing) {
      return { error: "An organization with this slug already exists." };
    }

    await Organization.findByIdAndUpdate(orgId, { $set: { name, slug } });
    revalidatePath("/super-admin/organizations");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to update organization.") };
  }
}

export async function deleteOrganizationAction(orgId: string): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  try {
    await connectDB();
    await Organization.findByIdAndDelete(orgId);
    await Promise.all([
      User.deleteMany({ orgId }),
      Product.deleteMany({ orgId }),
      QrBatch.deleteMany({ orgId }),
      QrCode.deleteMany({ orgId }),
      Dispatch.deleteMany({ orgId }),
      PointTransaction.deleteMany({ orgId }),
      Return.deleteMany({ orgId }),
    ]);
    revalidatePath("/super-admin/organizations");
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to delete organization.") };
  }
}

export async function updateOrgAdminAction(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();

  if (!name || !email || !orgId) {
    return { error: "Name, email, and organization are required." };
  }

  if (password) {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (!/[A-Z]/.test(password)) {
      return { error: "Password must contain at least one uppercase letter." };
    }
    if (!/[0-9]/.test(password)) {
      return { error: "Password must contain at least one number." };
    }
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email, _id: { $ne: userId } });
    if (existing) {
      return { error: "Another user with this email already exists." };
    }

    const updates: Record<string, unknown> = { name, email, orgId };
    if (password) {
      updates.passwordHash = await hashPassword(password);
    }

    await User.findByIdAndUpdate(userId, { $set: updates });
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to update Admin.") };
  }
}

export async function deleteOrgAdminAction(userId: string): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  try {
    await connectDB();
    await User.findByIdAndDelete(userId);
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to delete Admin.") };
  }
}

export async function saveSuperAdminSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { error: "Access denied." };
  }

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const { setSetting } = await import("@/services/settings");

  try {
    await Promise.all([
      setSetting("company_name", get("company_name"), "Global SaaS Platform Name"),
      setSetting("company_logo", get("company_logo"), "Global SaaS Platform Logo"),
      setSetting("company_favicon", get("company_favicon"), "Global SaaS Platform Favicon"),
      setSetting("company_phone", get("company_phone"), "Support Phone Number"),
      setSetting("company_email", get("company_email"), "Support Email Address"),
      setSetting("company_brand_color", get("company_brand_color"), "Platform Primary Brand Color"),
      setSetting("company_brand_secondary", get("company_brand_secondary"), "Platform Secondary Brand Color"),
      setSetting("company_brand_dark", get("company_brand_dark"), "Platform Hover Accent Color"),
      setSetting("company_brand_light", get("company_brand_light"), "Platform Background Tint Color"),
      setSetting("company_font_family", get("company_font_family"), "Platform Font Family"),
    ]);

    revalidatePath("/super-admin/settings");
    revalidatePath("/login");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to save super admin settings.") };
  }
}
