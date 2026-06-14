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
  description?: string;
  videoLinks?: string[];
  status?: ProductStatus;
};

async function generateSku(): Promise<string> {
  const year = new Date().getFullYear();
  // Only match auto-generated SKUs for this year (4-digit SNO): SKU-20260001
  const last = await Product.findOne({ sku: new RegExp(`^SKU-${year}\\d{4}$`) })
    .sort({ sku: -1 })
    .select("sku")
    .lean();
  const next = last?.sku ? parseInt(last.sku.slice(8), 10) + 1 : 1;
  return `SKU-${year}${String(next).padStart(4, "0")}`;
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
  ] as const) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`${k} must be a number ≥ 0.`);
  }
}

export async function createProduct(input: ProductInput) {
  await connectDB();
  const sku = input.sku?.trim() || await generateSku();
  const fullInput = { ...input, sku };
  assertValid(fullInput);
  const exists = await Product.findOne({ sku });
  if (exists) throw new Error("A product with this SKU already exists.");
  try {
    return await Product.create({
      sku,
      name: input.name.trim(),
      mrp: input.mrp,
      salesPrice: input.salesPrice,
      rewardPoints: input.rewardPoints,
      description: input.description?.trim(),
      videoLinks: cleanVideoLinks(input.videoLinks),
      status: input.status ?? "active",
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
  const sku = input.sku.trim();
  const clash = await Product.findOne({ sku, _id: { $ne: id } });
  if (clash) throw new Error("Another product already uses this SKU.");

  product.sku = sku;
  product.name = input.name.trim();
  product.mrp = input.mrp;
  product.salesPrice = input.salesPrice;
  product.rewardPoints = input.rewardPoints;
  product.description = input.description?.trim();
  product.videoLinks = cleanVideoLinks(input.videoLinks);
  if (input.status) product.status = input.status;
  await product.save();
}

export async function deleteProduct(id: string) {
  await connectDB();
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found.");
  await product.deleteOne();
}

function toDTO(d: {
  _id: unknown;
  sku?: string;
  name?: string;
  mrp?: number;
  salesPrice?: number;
  rewardPoints?: number;
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
    description: d.description ?? "",
    videoLinks: d.videoLinks ?? [],
    status: (d.status as ProductStatus) ?? "active",
  };
}

export async function listProducts(
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
  statusFilter?: ProductStatus,
): Promise<Paginated<ProductDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const query: Record<string, unknown> = {};
  if (statusFilter) query.status = statusFilter;
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
export async function listActiveProducts(): Promise<ProductDTO[]> {
  await connectDB();
  const docs = await Product.find({ status: "active" }).sort({ name: 1 }).lean();
  return docs.map(toDTO);
}
