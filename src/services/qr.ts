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
};

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

  const items: BatchDTO[] = docs.map((d) => ({
    id: String(d._id),
    productSku:
      (d.productId as { sku?: string } | null)?.sku ?? "—",
    total: d.totalCodes,
    masterCount: d.masterCount ?? 0,
    smallPerMaster: d.smallPerMaster ?? 0,
    productPerSmall: d.productPerSmall ?? 0,
    serialStart: d.serialStart,
    serialEnd: d.serialEnd,
    status: String(d.status),
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
  }));

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
