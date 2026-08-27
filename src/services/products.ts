import "server-only";
import { connectDB } from "@/db/mongoose";
import { Product } from "@/models/Product";
import type { ProductStatus } from "@/lib/product";
import { isDuplicateKeyError } from "@/lib/db-errors";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";

export type ProductDTO = {
  id: string;
  sku: string;
  name: string;
  mrp: number;
  salesPrice: number;
  rewardPoints: number;
  counterRewardPoints: number;
  description: string;
  videoLinks: string[];
  status: ProductStatus;
};

export type ProductInput = {
  sku?: string;
  name: string;
  mrp: number;
  salesPrice: number;
  rewardPoints: number;
  counterRewardPoints?: number;
  description?: string;
  videoLinks?: string[];
  status?: ProductStatus;
  orgId?: string;
};

async function generateSku(orgId?: string): Promise<string> {
  const year = new Date().getFullYear();
  // Find all auto-generated SKUs for this year and org
  const filter: Record<string, unknown> = { sku: new RegExp(`^SKU-${year}\\d{4}$`) };
  if (orgId) filter.orgId = orgId;
  
  const existing = await Product.find(filter).select("sku").lean();
  let maxNum = 0;
  for (const p of existing) {
    if (p.sku) {
      const match = p.sku.match(/^SKU-\d{4}(\d{4})$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
  }

  let next = maxNum + 1;
  let candidate = `SKU-${year}${String(next).padStart(4, "0")}`;
  
  // Guarantee candidate doesn't clash with any existing product
  while (await Product.findOne({ sku: candidate, ...(orgId ? { orgId } : {}) })) {
    next++;
    candidate = `SKU-${year}${String(next).padStart(4, "0")}`;
  }
  return candidate;
}

/** Trim, drop blanks, and validate each video link is a real http(s) URL. */
function cleanVideoLinks(links?: string[]): string[] {
  const cleaned = (links ?? []).map((l) => l.trim()).filter(Boolean);
  for (const url of cleaned) {
    if (!/^https?:\/\/.+/i.test(url)) {
      throw new Error(`"${url}" is not a valid URL (must start with http:// or https://).`);
    }
  }
  return cleaned;
}

function assertValid(input: ProductInput) {
  if (input.sku !== undefined && !input.sku.trim()) throw new Error("SKU is required.");
  if (!input.name.trim()) throw new Error("Name is required.");
  for (const [k, v] of [
    ["MRP", input.mrp],
    ["Sales price", input.salesPrice],
    ["Reward points", input.rewardPoints],
    ["Counter reward points", input.counterRewardPoints ?? 0],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`${k} must be a number ≥ 0.`);
  }
}

export async function createProduct(input: ProductInput) {
  await connectDB();
  const sku = input.sku?.trim() || await generateSku(input.orgId);
  const fullInput = { ...input, sku };
  assertValid(fullInput);
  const exists = await Product.findOne({ sku, ...(input.orgId ? { orgId: input.orgId } : {}) });
  if (exists) throw new Error("A product with this SKU already exists.");
  try {
    return await Product.create({
      sku,
      name: input.name.trim(),
      mrp: input.mrp,
      salesPrice: input.salesPrice,
      rewardPoints: input.rewardPoints,
      counterRewardPoints: input.counterRewardPoints ?? 0,
      description: input.description?.trim(),
      videoLinks: cleanVideoLinks(input.videoLinks),
      status: input.status ?? "active",
      ...(input.orgId ? { orgId: input.orgId } : {}),
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new Error("A product with this SKU already exists.");
    throw e;
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  await connectDB();
  if (!input.sku?.trim()) throw new Error("SKU is required.");
  assertValid(input);
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found.");
  // Org ownership check: if caller has an orgId, product must belong to same org
  if (input.orgId && product.orgId?.toString() !== input.orgId) {
    throw new Error("Product not found.");
  }
  const sku = input.sku.trim();
  const clash = await Product.findOne({ sku, _id: { $ne: id }, ...(input.orgId ? { orgId: input.orgId } : {}) });
  if (clash) throw new Error("Another product already uses this SKU.");

  product.sku = sku;
  product.name = input.name.trim();
  product.mrp = input.mrp;
  product.salesPrice = input.salesPrice;
  product.rewardPoints = input.rewardPoints;
  product.counterRewardPoints = input.counterRewardPoints ?? 0;
  product.description = input.description?.trim();
  product.videoLinks = cleanVideoLinks(input.videoLinks);
  if (input.status) product.status = input.status;
  await product.save();
}

export async function deleteProduct(id: string, orgId?: string) {
  await connectDB();
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found.");
  if (orgId && product.orgId?.toString() !== orgId) {
    throw new Error("Product not found.");
  }
  await product.deleteOne();
}

function toDTO(d: {
  _id: unknown;
  sku?: string;
  name?: string;
  mrp?: number;
  salesPrice?: number;
  rewardPoints?: number;
  counterRewardPoints?: number;
  description?: string | null;
  videoLinks?: string[] | null;
  status?: string;
}): ProductDTO {
  return {
    id: String(d._id),
    sku: d.sku ?? "",
    name: d.name ?? "",
    mrp: d.mrp ?? 0,
    salesPrice: d.salesPrice ?? 0,
    rewardPoints: d.rewardPoints ?? 0,
    counterRewardPoints: d.counterRewardPoints ?? 0,
    description: d.description ?? "",
    videoLinks: d.videoLinks ?? [],
    status: (d.status as ProductStatus) ?? "active",
  };
}

export async function listProducts(
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
  statusFilter?: ProductStatus,
  orgId?: string,
): Promise<Paginated<ProductDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const query: Record<string, unknown> = {};
  if (statusFilter) query.status = statusFilter;
  if (orgId) query.orgId = orgId;
  if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { sku: { $regex: search, $options: "i" } }];
  const total = await Product.countDocuments(query);
  const docs = await Product.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
  return paginated(docs.map(toDTO), total, pagination);
}

/** Active products for select inputs (QR generation). */
export async function listActiveProducts(orgId?: string): Promise<ProductDTO[]> {
  await connectDB();
  const query: Record<string, unknown> = { status: "active" };
  if (orgId) query.orgId = orgId;
  const docs = await Product.find(query).sort({ name: 1 }).lean();
  return docs.map(toDTO);
}
