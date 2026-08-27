import { z } from "zod";

// ── User Schemas ─────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  role: z.enum(["admin", "sales_rep", "distributor", "counter", "khati"]),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .optional()
    .or(z.literal("")),
  phone: z.string().min(7, "Invalid phone number").max(20).optional().or(z.literal("")),
  counterId: z.string().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  id: z.string().min(1, "User ID required"),
  name: z.string().min(2).max(100).optional(),
  status: z.enum(["active", "pending", "suspended"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(20).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .optional()
    .or(z.literal("")),
});

// ── Product Schemas ───────────────────────────────────────────────────────────

export const productSchema = z.object({
  sku: z.string().max(64).optional(),
  name: z.string().min(1, "Name is required").max(200),
  mrp: z.number().min(0, "MRP must be ≥ 0"),
  salesPrice: z.number().min(0),
  rewardPoints: z.number().min(0).max(100000),
  description: z.string().max(2000).optional(),
  videoLinks: z.array(z.string().url("Invalid URL")).max(5).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// ── Organisation / SaaS Schemas ───────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(64, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
});

export const createOrgAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  orgId: z.string().min(1, "Organisation required"),
});

// ── Branding Schema ───────────────────────────────────────────────────────────

export const brandingSchema = z.object({
  company_name: z.string().max(100).optional(),
  company_tagline: z.string().max(200).optional(),
  company_phone: z.string().max(20).optional(),
  company_email: z.string().email().optional().or(z.literal("")),
  company_address: z.string().max(500).optional(),
  company_website: z.string().url().optional().or(z.literal("")),
  company_brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex colour")
    .optional()
    .or(z.literal("")),
  company_brand_secondary: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex colour")
    .optional()
    .or(z.literal("")),
  company_brand_dark: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex colour")
    .optional()
    .or(z.literal("")),
  company_brand_light: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex colour")
    .optional()
    .or(z.literal("")),
});
