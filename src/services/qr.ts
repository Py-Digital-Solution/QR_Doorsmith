import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/db/mongoose";
import { Product } from "@/models/Product";
import { QrBatch } from "@/models/QrBatch";
import { QrCode, type QrCodeDoc } from "@/models/QrCode";
import { Sequence } from "@/models/Sequence";
import { formatSerial, type QrType, type QrStatus } from "@/lib/qr";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";

const SERIAL_SEQ = "qr_serial";
const MAX_BATCH = 5000; // safety ceiling (SOW targets ~2,000/day)

/** Atomically reserve a contiguous block of `count` serials; returns the start. */
async function reserveSerials(count: number): Promise<number> {
  const doc = await Sequence.findByIdAndUpdate(
    SERIAL_SEQ,
    { $inc: { value: count } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const end = doc!.value; // value AFTER increment
  return end - count + 1;
}

export type SheetConfig = {
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  labelWidthMm?: number;
  labelHeightMm?: number;
  columns?: number;
  rows?: number;
};

export type GenerateBatchInput = {
  productId: string;
  createdBy: string;
  masterCount: number;
  smallPerMaster: number;
  productPerSmall: number;
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

  const masters = masterCount;
  const smalls = masters * smallPerMaster;
  const products = smalls * productPerSmall;
  const total = masters + smalls + products;

  if (total <= 0) throw new Error("Nothing to generate — set at least one count.");
  if (total > MAX_BATCH)
    throw new Error(`Batch too large (${total}). Max ${MAX_BATCH} codes per batch.`);

  const product = await Product.findById(input.productId);
  if (!product) throw new Error("Product not found.");

  const start = await reserveSerials(total);

  const batch = await QrBatch.create({
    productId: product._id,
    createdBy: input.createdBy,
    masterCount,
    smallPerMaster,
    productPerSmall,
    totalCodes: total,
    serialStart: start,
    serialEnd: start + total - 1,
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

  // Pre-generate ObjectIds so children can reference their parent before insert.
  let serial = start;
  const docs: Record<string, unknown>[] = [];

  for (let m = 0; m < masterCount; m++) {
    const masterId = new Types.ObjectId();
    docs.push({
      _id: masterId,
      serialNo: formatSerial(serial++),
      type: "master" as QrType,
      parentQrId: null,
      ...meta,
    });

    for (let s = 0; s < smallPerMaster; s++) {
      const smallId = new Types.ObjectId();
      docs.push({
        _id: smallId,
        serialNo: formatSerial(serial++),
        type: "small" as QrType,
        parentQrId: masterId,
        ...meta,
      });

      for (let p = 0; p < productPerSmall; p++) {
        docs.push({
          _id: new Types.ObjectId(),
          serialNo: formatSerial(serial++),
          type: "product" as QrType,
          parentQrId: smallId,
          ...meta,
        });
      }
    }
  }

  await QrCode.insertMany(docs as unknown as QrCodeDoc[], { ordered: true });

  return { batchId: String(batch._id), total, serialStart: start, serialEnd: start + total - 1 };
}

// ---- read models ----

export type BatchDTO = {
  id: string;
  productSku: string;
  total: number;
  masterCount: number;
  smallPerMaster: number;
  productPerSmall: number;
  serialStart: number;
  serialEnd: number;
  status: string;
  createdAt: string;
  /** How many codes are still in the warehouse (not yet dispatched). */
  warehouseCount: number;
  /** How many codes have been dispatched to a counter (active or scanned). */
  dispatchedCount: number;
};

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
): Promise<Paginated<BatchDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const total = await QrBatch.countDocuments({});
  const docs = await QrBatch.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ productId: { sku?: string } }>("productId", "sku")
    .lean();

  const dispatched = await dispatchedCountsByBatch(docs.map((d) => d._id as Types.ObjectId));

  const items: BatchDTO[] = docs.map((d) => {
    const dispatchedCount = dispatched.get(String(d._id)) ?? 0;
    return {
      id: String(d._id),
      productSku: (d.productId as { sku?: string } | null)?.sku ?? "—",
      total: d.totalCodes,
      masterCount: d.masterCount ?? 0,
      smallPerMaster: d.smallPerMaster ?? 0,
      productPerSmall: d.productPerSmall ?? 0,
      serialStart: d.serialStart,
      serialEnd: d.serialEnd,
      status: String(d.status),
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
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
 * A code is "locked" once it has left the warehouse — dispatched to a counter
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
      `Cannot modify this batch — ${locked} code(s) are already dispatched or scanned.`,
    );
  }
}

export type UpdateBatchInput = {
  productId?: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  columns?: number;
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

  const sheet = { ...(batch.sheetConfig ?? {}) } as Record<string, number>;
  if (input.labelWidthMm) sheet.labelWidthMm = input.labelWidthMm;
  if (input.labelHeightMm) sheet.labelHeightMm = input.labelHeightMm;
  if (input.columns) sheet.columns = input.columns;
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
    .populate<{ productId: { sku?: string } }>("productId", "sku")
    .lean();
  if (!d) return null;

  const dispatchedCount = await QrCode.countDocuments({
    batchId: d._id,
    counterId: { $ne: null },
  });

  return {
    id: String(d._id),
    productSku: (d.productId as { sku?: string } | null)?.sku ?? "—",
    total: d.totalCodes,
    masterCount: d.masterCount ?? 0,
    smallPerMaster: d.smallPerMaster ?? 0,
    productPerSmall: d.productPerSmall ?? 0,
    serialStart: d.serialStart,
    serialEnd: d.serialEnd,
    status: String(d.status),
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    dispatchedCount,
    warehouseCount: Math.max(0, d.totalCodes - dispatchedCount),
  };
}

/** Paginated codes within a batch, with locked flag, parent + counter, and a status filter. */
export async function listBatchCodes(
  batchId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  filter: CodeFilter = "all",
): Promise<Paginated<BatchCodeDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const query = { batchId, ...codeFilterQuery(filter) };
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
      counterLabel: counter ? counter.name || counter.email || "—" : null,
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

/** Enable/disable a single code, or relink it (and its children) to a product. */
export async function updateQrCode(
  codeId: string,
  input: { status?: "inactive" | "disabled"; productId?: string },
) {
  await connectDB();
  const code = await QrCode.findById(codeId);
  if (!code) throw new Error("QR code not found.");
  if (code.counterId || code.dispatchId || code.scannedByKhatiId || code.status === "scanned") {
    throw new Error("Cannot edit — this code is already dispatched or scanned.");
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
    throw new Error("Cannot delete — this code or one of its children is dispatched/scanned.");
  }

  const res = await QrCode.deleteMany({ _id: { $in: ids } });
  const removed = res.deletedCount ?? ids.length;
  await QrBatch.findByIdAndUpdate(code.batchId, { $inc: { totalCodes: -removed } });
  return { ok: true, removed };
}

export type BatchPrintData = {
  productSku: string;
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
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

  return {
    productSku: codes[0]?.sku ?? "",
    labelWidthMm: batch.sheetConfig?.labelWidthMm ?? 40,
    labelHeightMm: batch.sheetConfig?.labelHeightMm ?? 40,
    columns: batch.sheetConfig?.columns ?? 4,
    codes: codes.map((c) => ({ serialNo: c.serialNo, type: String(c.type) })),
  };
}
