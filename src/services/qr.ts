import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/db/mongoose";
import { Product } from "@/models/Product";
import { QrBatch } from "@/models/QrBatch";
import { QrCode, type QrCodeDoc } from "@/models/QrCode";
import { Sequence } from "@/models/Sequence";
import {
  formatMasterSerial,
  formatSmallSerial,
  formatProductSerial,
  type QrType,
  type QrStatus,
} from "@/lib/qr";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE_KEY } from "@/lib/page-sizes";

const MAX_BATCH = 5000; // safety ceiling (SOW targets ~2,000/day)

/** Reserve a contiguous block of `count` serials for the given type+SKU; returns the start. */
async function reserveSerials(type: QrType, sku: string, count: number): Promise<number> {
  if (count === 0) return 0;
  const key = `qr_serial_${type}_${sku}`;
  const doc = await Sequence.findByIdAndUpdate(
    key,
    { $inc: { value: count } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const end = doc!.value;
  return end - count + 1;
}

export type SheetConfig = {
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  columns?: number;
  rows?: number;
  pageSize?: string;
};

export type QrSizes = {
  masterSize?: number;
  smallSize?: number;
  productSize?: number;
};

export type GenerateBatchInput = {
  productId: string;
  createdBy: string;
  masterCount: number;
  smallPerMaster: number;
  productPerSmall: number;
  qrSizes?: QrSizes;
  sheetConfig?: SheetConfig;
};

/**
 * Generate a batch of QR codes with a Master → Small → Product hierarchy.
 * Serial numbers come from an atomic reserved range (serialization guard), and
 * product pricing/points are snapshotted onto every code.
 */
export async function generateBatch(input: GenerateBatchInput) {
  await connectDB();

  const masterCount = Math.max(0, Math.floor(input.masterCount));
  const smallPerMaster = Math.max(0, Math.floor(input.smallPerMaster));
  const productPerSmall = Math.max(0, Math.floor(input.productPerSmall));

  // When masterCount === 0, smallPerMaster is treated as total smalls (not per-master).
  const totalMasters = masterCount;
  const totalSmalls = masterCount > 0 ? masterCount * smallPerMaster : smallPerMaster;
  const totalProducts =
    masterCount > 0
      ? masterCount * smallPerMaster * productPerSmall
      : smallPerMaster > 0
        ? smallPerMaster * productPerSmall
        : productPerSmall;
  const total = totalMasters + totalSmalls + totalProducts;

  if (total <= 0) throw new Error("Nothing to generate  set at least one count.");
  if (total > MAX_BATCH)
    throw new Error(`Batch too large (${total}). Max ${MAX_BATCH} codes per batch.`);

  const product = await Product.findById(input.productId);
  if (!product) throw new Error("Product not found.");

  const sku = String(product.sku ?? "XX");

  // Reserve serial ranges per type, scoped to this product's SKU.
  const [masterStart, smallStart, productStart] = await Promise.all([
    reserveSerials("master", sku, totalMasters),
    reserveSerials("small", sku, totalSmalls),
    reserveSerials("product", sku, totalProducts),
  ]);

  // Top-level serial range stored on the batch (master → small → product priority).
  const topStart = totalMasters > 0 ? masterStart : totalSmalls > 0 ? smallStart : productStart;
  const topEnd =
    totalMasters > 0
      ? masterStart + totalMasters - 1
      : totalSmalls > 0
        ? smallStart + totalSmalls - 1
        : productStart + totalProducts - 1;

  const batch = await QrBatch.create({
    productId: product._id,
    createdBy: input.createdBy,
    masterCount,
    smallPerMaster,
    productPerSmall,
    totalCodes: total,
    serialStart: topStart,
    serialEnd: topEnd,
    qrSizes: input.qrSizes,
    sheetConfig: input.sheetConfig,
    status: "in_warehouse",
  });

  const meta = {
    productId: product._id,
    batchId: batch._id,
    sku: product.sku,
    mrp: product.mrp,
    salesPrice: product.salesPrice,
    rewardPoints: product.rewardPoints,
    status: "inactive" as QrStatus,
  };

  const docs: Record<string, unknown>[] = [];
  let mSerial = masterStart;
  let sSerial = smallStart;
  let pSerial = productStart;

  if (totalMasters > 0) {
    // Full hierarchy or masters-only / masters+smalls.
    for (let m = 0; m < totalMasters; m++) {
      const masterId = new Types.ObjectId();
      const mN = mSerial++;
      docs.push({ _id: masterId, serialNo: formatMasterSerial(sku, mN), type: "master" as QrType, parentQrId: null, ...meta });

      for (let s = 0; s < smallPerMaster; s++) {
        const smallId = new Types.ObjectId();
        const sN = sSerial++;
        docs.push({ _id: smallId, serialNo: formatSmallSerial(sku, sN), type: "small" as QrType, parentQrId: masterId, ...meta });

        for (let p = 0; p < productPerSmall; p++) {
          const pN = pSerial++;
          docs.push({ _id: new Types.ObjectId(), serialNo: formatProductSerial(sku, pN), type: "product" as QrType, parentQrId: smallId, ...meta });
        }
      }
    }
  } else if (totalSmalls > 0) {
    // No masters: smalls are top-level.
    for (let s = 0; s < totalSmalls; s++) {
      const smallId = new Types.ObjectId();
      const sN = sSerial++;
      docs.push({ _id: smallId, serialNo: formatSmallSerial(sku, sN), type: "small" as QrType, parentQrId: null, ...meta });

      for (let p = 0; p < productPerSmall; p++) {
        const pN = pSerial++;
        docs.push({ _id: new Types.ObjectId(), serialNo: formatProductSerial(sku, pN), type: "product" as QrType, parentQrId: smallId, ...meta });
      }
    }
  } else {
    // Standalone products only.
    for (let p = 0; p < totalProducts; p++) {
      const pN = pSerial++;
      docs.push({ _id: new Types.ObjectId(), serialNo: formatProductSerial(sku, pN), type: "product" as QrType, parentQrId: null, ...meta });
    }
  }

  await QrCode.insertMany(docs as unknown as QrCodeDoc[], { ordered: true });

  return { batchId: String(batch._id), total, serialStart: topStart, serialEnd: topEnd };
}

// ---- read models ----

export type BatchDTO = {
  id: string;
  productSku: string;
  productName: string;
  total: number;
  masterCount: number;
  smallPerMaster: number;
  productPerSmall: number;
  serialStart: number;
  serialEnd: number;
  /** Formatted label for the first serial in the top-level range. */
  serialStartLabel: string;
  /** Formatted label for the last serial in the top-level range. */
  serialEndLabel: string;
  status: string;
  createdAt: string;
  /** Print page size key (e.g. "12x18", "A4"). */
  pageSize: string;
  /** How many codes are still in the warehouse (not yet dispatched). */
  warehouseCount: number;
  /** How many codes have been dispatched to a counter (active or scanned). */
  dispatchedCount: number;
};

/** Compute the formatted serial label for the batch's top-level range boundary. */
function batchSerialLabel(
  sku: string,
  n: number,
  masterCount: number,
  smallPerMaster: number,
): string {
  if (masterCount > 0) return formatMasterSerial(sku, n);
  if (smallPerMaster > 0) return formatSmallSerial(sku, n);
  return formatProductSerial(sku, n);
}

/** Map of batchId → dispatched-code count, computed in a single aggregation. */
async function dispatchedCountsByBatch(
  batchIds: Types.ObjectId[],
): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map();
  const rows = await QrCode.aggregate<{ _id: Types.ObjectId; dispatched: number }>([
    { $match: { batchId: { $in: batchIds }, counterId: { $ne: null } } },
    { $group: { _id: "$batchId", dispatched: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.dispatched]));
}

export async function listBatches(
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
): Promise<Paginated<BatchDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const query: Record<string, unknown> = {};
  if (search) {
    // Search by product SKU (text) and/or master serial number (numeric range).
    const skuMatches = await Product.find({ sku: { $regex: search, $options: "i" } })
      .select("_id")
      .lean();
    const digits = search.replace(/\D/g, "");
    const serialNum = digits.length > 0 ? parseInt(digits, 10) : NaN;
    const orClauses: Record<string, unknown>[] = [];
    if (skuMatches.length) orClauses.push({ productId: { $in: skuMatches.map((p) => p._id) } });
    if (Number.isFinite(serialNum) && serialNum > 0) {
      orClauses.push({ serialStart: { $lte: serialNum }, serialEnd: { $gte: serialNum } });
    }
    if (orClauses.length) query.$or = orClauses;
  }
  const total = await QrBatch.countDocuments(query);
  const docs = await QrBatch.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ productId: { sku?: string; name?: string } }>("productId", "sku name")
    .lean();

  const dispatched = await dispatchedCountsByBatch(docs.map((d) => d._id as Types.ObjectId));

  const items: BatchDTO[] = docs.map((d) => {
    const dispatchedCount = dispatched.get(String(d._id)) ?? 0;
    const prod = d.productId as { sku?: string; name?: string } | null;
    const mCount = d.masterCount ?? 0;
    const sCount = d.smallPerMaster ?? 0;
    const prodSku = prod?.sku ?? "XX";
    return {
      id: String(d._id),
      productSku: prodSku,
      productName: prod?.name ?? "",
      total: d.totalCodes,
      masterCount: mCount,
      smallPerMaster: sCount,
      productPerSmall: d.productPerSmall ?? 0,
      serialStart: d.serialStart,
      serialEnd: d.serialEnd,
      serialStartLabel: batchSerialLabel(prodSku, d.serialStart, mCount, sCount),
      serialEndLabel: batchSerialLabel(prodSku, d.serialEnd, mCount, sCount),
      status: String(d.status),
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
      pageSize: d.sheetConfig?.pageSize ?? DEFAULT_PAGE_SIZE_KEY,
      dispatchedCount,
      warehouseCount: Math.max(0, d.totalCodes - dispatchedCount),
    };
  });

  return paginated(items, total, pagination);
}

export type QrCodeDTO = {
  id: string;
  serialNo: string;
  type: string;
  status: string;
  sku: string;
};

/** Codes for a batch (used by the print/PDF export). */
export async function getBatchCodes(batchId: string): Promise<QrCodeDTO[]> {
  await connectDB();
  const docs = await QrCode.find({ batchId }).sort({ serialNo: 1 }).lean();
  return docs.map((d) => ({
    id: String(d._id),
    serialNo: d.serialNo,
    type: String(d.type),
    status: String(d.status),
    sku: d.sku ?? "",
  }));
}

// ---- edit / delete (client feedback: "Edit and delete in QR") ----

/**
 * A code is "locked" once it has left the warehouse  dispatched to a counter
 * or scanned by a khati. Locked codes cannot be edited or deleted (a carpenter
 * may already be holding the printed label and the points ledger depends on it).
 * Confirmed rule: edit/delete only while a code is still in the warehouse.
 */
const LOCKED_FILTER = {
  $or: [
    { counterId: { $ne: null } },
    { dispatchId: { $ne: null } },
    { status: "scanned" as QrStatus },
    { scannedByKhatiId: { $ne: null } },
  ],
};

async function assertBatchUnlocked(batchId: string): Promise<void> {
  const locked = await QrCode.countDocuments({ batchId, ...LOCKED_FILTER });
  if (locked > 0) {
    throw new Error(
      `Cannot modify this batch  ${locked} code(s) are already dispatched or scanned.`,
    );
  }
}

export type UpdateBatchInput = {
  productId?: string;
  columns?: number;
  pageSize?: string;
};

/** Edit a batch (before dispatch only). Relinking the product re-snapshots all codes. */
export async function updateBatch(batchId: string, input: UpdateBatchInput) {
  await connectDB();
  const batch = await QrBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found.");
  await assertBatchUnlocked(batchId);

  if (input.productId && String(input.productId) !== String(batch.productId)) {
    const product = await Product.findById(input.productId);
    if (!product) throw new Error("Product not found.");
    batch.productId = product._id;
    await QrCode.updateMany(
      { batchId: batch._id },
      {
        $set: {
          productId: product._id,
          sku: product.sku,
          mrp: product.mrp,
          salesPrice: product.salesPrice,
          rewardPoints: product.rewardPoints,
        },
      },
    );
  }

  const sheet = { ...(batch.sheetConfig ?? {}) } as Record<string, number | string>;
  if (input.columns) sheet.columns = input.columns;
  if (input.pageSize) sheet.pageSize = input.pageSize;
  batch.sheetConfig = sheet;

  await batch.save();
  return { ok: true };
}

/** Delete an entire batch and all its codes (before dispatch only). */
export async function deleteBatch(batchId: string) {
  await connectDB();
  const batch = await QrBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found.");
  await assertBatchUnlocked(batchId);

  await QrCode.deleteMany({ batchId: batch._id });
  await QrBatch.findByIdAndDelete(batch._id);
  return { ok: true };
}

export type BatchCodeDTO = {
  id: string;
  serialNo: string;
  type: string;
  status: string;
  sku: string;
  parentSerial: string | null;
  counterLabel: string | null;
  locked: boolean;
};

export const CODE_FILTERS = ["all", "warehouse", "dispatched", "scanned"] as const;
export type CodeFilter = (typeof CODE_FILTERS)[number];

function codeFilterQuery(filter: CodeFilter): Record<string, unknown> {
  switch (filter) {
    case "warehouse":
      return { counterId: null };
    case "dispatched":
      return { counterId: { $ne: null }, status: { $ne: "scanned" } };
    case "scanned":
      return { status: "scanned" };
    default:
      return {};
  }
}

/** Header info for a batch detail page (incl. warehouse/dispatched counts). */
export async function getBatch(batchId: string): Promise<BatchDTO | null> {
  await connectDB();
  const d = await QrBatch.findById(batchId)
    .populate<{ productId: { sku?: string; name?: string } }>("productId", "sku name")
    .lean();
  if (!d) return null;

  const dispatchedCount = await QrCode.countDocuments({
    batchId: d._id,
    counterId: { $ne: null },
  });

  const prod = d.productId as { sku?: string; name?: string } | null;
  const mCount = d.masterCount ?? 0;
  const sCount = d.smallPerMaster ?? 0;
  const prodSku = prod?.sku ?? "XX";
  return {
    id: String(d._id),
    productSku: prodSku,
    productName: prod?.name ?? "",
    total: d.totalCodes,
    masterCount: mCount,
    smallPerMaster: sCount,
    productPerSmall: d.productPerSmall ?? 0,
    serialStart: d.serialStart,
    serialEnd: d.serialEnd,
    serialStartLabel: batchSerialLabel(prodSku, d.serialStart, mCount, sCount),
    serialEndLabel: batchSerialLabel(prodSku, d.serialEnd, mCount, sCount),
    status: String(d.status),
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    pageSize: d.sheetConfig?.pageSize ?? DEFAULT_PAGE_SIZE_KEY,
    dispatchedCount,
    warehouseCount: Math.max(0, d.totalCodes - dispatchedCount),
  };
}

/** Paginated codes within a batch, with locked flag, parent + counter, and a status filter. */
export async function listBatchCodes(
  batchId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  filter: CodeFilter = "all",
  search?: string,
): Promise<Paginated<BatchCodeDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const baseQuery = { batchId, ...codeFilterQuery(filter) };
  const query: Record<string, unknown> = { ...baseQuery };
  if (search) query.$or = [{ serialNo: { $regex: search, $options: "i" } }, { sku: { $regex: search, $options: "i" } }];
  const total = await QrCode.countDocuments(query);
  const docs = await QrCode.find(query)
    .sort({ serialNo: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ parentQrId: { serialNo?: string } | null }>("parentQrId", "serialNo")
    .populate<{ counterId: { name?: string; email?: string } | null }>("counterId", "name email")
    .lean();

  const items: BatchCodeDTO[] = docs.map((d) => {
    const counter = d.counterId as { name?: string; email?: string } | null;
    return {
      id: String(d._id),
      serialNo: d.serialNo,
      type: String(d.type),
      status: String(d.status),
      sku: d.sku ?? "",
      parentSerial: (d.parentQrId as { serialNo?: string } | null)?.serialNo ?? null,
      counterLabel: counter ? counter.name || counter.email || "" : null,
      locked: Boolean(d.counterId || d.dispatchId || d.scannedByKhatiId || d.status === "scanned"),
    };
  });
  return paginated(items, total, pagination);
}

/** Collect a code's id plus all descendant ids (BFS over parentQrId). */
async function collectWithDescendants(rootId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const all: Types.ObjectId[] = [rootId];
  let frontier: Types.ObjectId[] = [rootId];
  while (frontier.length) {
    const children = await QrCode.find({ parentQrId: { $in: frontier } }).select("_id").lean();
    frontier = children.map((c) => c._id as Types.ObjectId);
    all.push(...frontier);
  }
  return all;
}

/** Update a code's status or re-link its product. Admin can pass `adminOverride` to bypass the lock guard. */
export async function updateQrCode(
  codeId: string,
  input: { status?: QrStatus; productId?: string; adminOverride?: boolean },
) {
  await connectDB();
  const code = await QrCode.findById(codeId);
  if (!code) throw new Error("QR code not found.");
  if (!input.adminOverride && (code.counterId || code.dispatchId || code.scannedByKhatiId || code.status === "scanned")) {
    throw new Error("Cannot edit  this code is already dispatched or scanned.");
  }

  if (input.productId && String(input.productId) !== String(code.productId)) {
    const product = await Product.findById(input.productId);
    if (!product) throw new Error("Product not found.");
    const ids = await collectWithDescendants(code._id as Types.ObjectId);
    await QrCode.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          productId: product._id,
          sku: product.sku,
          mrp: product.mrp,
          salesPrice: product.salesPrice,
          rewardPoints: product.rewardPoints,
        },
      },
    );
  }

  if (input.status) {
    code.status = input.status;
    await code.save();
  }
  return { ok: true };
}

/** Delete a single code and its descendants (before dispatch only). */
export async function deleteQrCode(codeId: string) {
  await connectDB();
  const code = await QrCode.findById(codeId);
  if (!code) throw new Error("QR code not found.");

  const ids = await collectWithDescendants(code._id as Types.ObjectId);
  const locked = await QrCode.countDocuments({ _id: { $in: ids }, ...LOCKED_FILTER });
  if (locked > 0) {
    throw new Error("Cannot delete  this code or one of its children is dispatched/scanned.");
  }

  const res = await QrCode.deleteMany({ _id: { $in: ids } });
  const removed = res.deletedCount ?? ids.length;
  await QrBatch.findByIdAndUpdate(code.batchId, { $inc: { totalCodes: -removed } });
  return { ok: true, removed };
}

export type BatchPrintData = {
  productSku: string;
  columns: number;
  pageSize: string;
  qrSizes: { master: number; small: number; product: number };
  codes: { serialNo: string; type: string }[];
};

/** Batch + its codes + sheet config, for the print/PDF route. */
export async function getBatchPrintData(
  batchId: string,
): Promise<BatchPrintData | null> {
  await connectDB();
  const batch = await QrBatch.findById(batchId).lean();
  if (!batch) return null;

  const codes = await QrCode.find({ batchId })
    .sort({ serialNo: 1 })
    .select("serialNo type sku")
    .lean();

  // Print products first, then the box codes (small, then master) at the end.
  const TYPE_ORDER: Record<string, number> = { product: 0, small: 1, master: 2 };
  const ordered = [...codes].sort((a, b) => {
    const ta = TYPE_ORDER[String(a.type)] ?? 0;
    const tb = TYPE_ORDER[String(b.type)] ?? 0;
    if (ta !== tb) return ta - tb;
    return a.serialNo.localeCompare(b.serialNo);
  });

  return {
    productSku: codes[0]?.sku ?? "",
    columns: batch.sheetConfig?.columns ?? 4,
    pageSize: batch.sheetConfig?.pageSize ?? DEFAULT_PAGE_SIZE_KEY,
    qrSizes: {
      master: batch.qrSizes?.masterSize ?? 25,
      small: batch.qrSizes?.smallSize ?? 15,
      product: batch.qrSizes?.productSize ?? 10,
    },
    codes: ordered.map((c) => ({ serialNo: c.serialNo, type: String(c.type) })),
  };
}
