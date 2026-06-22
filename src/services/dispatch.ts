import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { Dispatch } from "@/models/Dispatch";
import { Sequence } from "@/models/Sequence";
import { User } from "@/models/User";
import { formatBillNo, type QrType } from "@/lib/qr";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";

const BILL_SEQ = "dispatch_no";

async function nextBillNo(): Promise<string> {
  const doc = await Sequence.findByIdAndUpdate(
    BILL_SEQ,
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return formatBillNo(doc!.value);
}

export type CreateDispatchResult = {
  billNo: string;
  dispatchId: string;
  totalCodes: number;
};

/** Collect ids of every undispatched descendant under the given root ids (BFS). */
async function collectUndispatchedDescendants(
  rootIds: Types.ObjectId[],
  seen: Set<string>,
): Promise<Types.ObjectId[]> {
  const collected: Types.ObjectId[] = [];
  let frontier = rootIds;
  while (frontier.length) {
    const children = await QrCode.find({
      parentQrId: { $in: frontier },
      counterId: null, // never steal a code already dispatched elsewhere
    })
      .select("_id")
      .lean();
    frontier = [];
    for (const c of children) {
      const idStr = String(c._id);
      if (seen.has(idStr)) continue;
      seen.add(idStr);
      const oid = c._id as Types.ObjectId;
      collected.push(oid);
      frontier.push(oid);
    }
  }
  return collected;
}

/**
 * Create a dispatch bill: validate the scanned serials (any level  master box,
 * small box, or a single unique product code), link each scanned unit plus all
 * of its descendants to the chosen counter, activate them, and record the bill.
 * (Should become transactional once the Mongo replica set is configured  see
 * Docs/SECURITY.md.)
 */
export async function createDispatch(input: {
  createdBy: string;
  counterId: string;
  serials: string[];
}): Promise<CreateDispatchResult> {
  await connectDB();

  const counter = await User.findOne({ _id: input.counterId, role: "counter" });
  if (!counter) throw new Error("Select a valid counter.");

  const serials = Array.from(
    new Set(input.serials.map((s) => s.trim()).filter(Boolean)),
  );
  if (serials.length === 0) throw new Error("Scan at least one QR code.");

  // Roots can be ANY type: master, small, or product (unique code).
  const roots = await QrCode.find({ serialNo: { $in: serials } });
  const found = new Set(roots.map((r) => r.serialNo));
  const missing = serials.filter((s) => !found.has(s));
  if (missing.length) {
    throw new Error(`Not found: ${missing.join(", ")}`);
  }

  const already = roots.filter((r) => r.counterId);
  if (already.length) {
    throw new Error(`Already dispatched: ${already.map((r) => r.serialNo).join(", ")}`);
  }

  const seen = new Set<string>();
  const rootIds: Types.ObjectId[] = [];
  for (const r of roots) {
    const oid = r._id as Types.ObjectId;
    seen.add(String(oid));
    rootIds.push(oid);
  }
  const descendantIds = await collectUndispatchedDescendants(rootIds, seen);
  const allIds = [...rootIds, ...descendantIds];

  const billNo = await nextBillNo();
  const dispatch = await Dispatch.create({
    billNo,
    counterId: counter._id,
    createdBy: input.createdBy,
    rootQrIds: rootIds,
    rootCount: rootIds.length,
    masterQrIds: rootIds, // mirror for backward compatibility
    masterCount: rootIds.length,
    totalCodes: allIds.length,
    status: "dispatched",
  });

  await QrCode.updateMany(
    { _id: { $in: allIds } },
    { $set: { counterId: counter._id, dispatchId: dispatch._id, status: "active" } },
  );

  return { billNo, dispatchId: String(dispatch._id), totalCodes: allIds.length };
}

// ---- read models ----

export type DispatchDTO = {
  id: string;
  billNo: string;
  counterLabel: string;
  unitCount: number;
  totalCodes: number;
  status: string;
  createdAt: string;
};

function counterLabel(c: { name?: string; email?: string } | null): string {
  return c?.name || c?.email || "—";
}

export async function listDispatches(
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
): Promise<Paginated<DispatchDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const query: Record<string, unknown> = {};
  if (search) query.billNo = { $regex: search, $options: "i" };
  const total = await Dispatch.countDocuments(query);
  const docs = await Dispatch.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ counterId: { name?: string; email?: string } }>("counterId", "name email")
    .lean();

  const items: DispatchDTO[] = docs.map((d) => ({
    id: String(d._id),
    billNo: d.billNo,
    counterLabel: counterLabel(d.counterId as { name?: string; email?: string } | null),
    unitCount: d.rootCount ?? d.masterCount ?? 0,
    totalCodes: d.totalCodes ?? 0,
    status: String(d.status),
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
  }));
  return paginated(items, total, pagination);
}

export type DispatchBill = {
  billNo: string;
  counterName: string;
  counterContact: string;
  createdAt: string;
  unitCount: number;
  totalCodes: number;
  units: { serialNo: string; type: string; sku: string }[];
};

export async function getDispatchBill(id: string): Promise<DispatchBill | null> {
  await connectDB();
  const d = await Dispatch.findById(id)
    .populate<{ counterId: { name?: string; email?: string; phone?: string } }>(
      "counterId",
      "name email phone",
    )
    .lean();
  if (!d) return null;

  const rootIds = d.rootQrIds?.length ? d.rootQrIds : d.masterQrIds;
  const units = await QrCode.find({ _id: { $in: rootIds } })
    .select("serialNo type sku")
    .sort({ serialNo: 1 })
    .lean();

  const c = d.counterId as { name?: string; email?: string; phone?: string } | null;
  return {
    billNo: d.billNo,
    counterName: c?.name || "—",
    counterContact: c?.email || c?.phone || "",
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    unitCount: d.rootCount ?? d.masterCount ?? 0,
    totalCodes: d.totalCodes ?? 0,
    units: units.map((m) => ({
      serialNo: m.serialNo,
      type: String(m.type),
      sku: m.sku ?? "",
    })),
  };
}

// ---- dispatch picker search (type-filtered, undispatched only) ----

export type DispatchableCodeDTO = {
  id: string;
  serialNo: string;
  type: string;
  sku: string;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Search codes available to dispatch (still in the warehouse  counterId null),
 * optionally filtered by type and a serial-number substring. Powers the
 * Dispatch screen's searchable Type dropdown.
 */
export async function searchDispatchableCodes(input: {
  type?: QrType;
  query?: string;
  limit?: number;
}): Promise<DispatchableCodeDTO[]> {
  await connectDB();
  const q: Record<string, unknown> = { counterId: null };
  if (input.type) q.type = input.type;
  const query = (input.query ?? "").trim();
  if (query) q.serialNo = { $regex: escapeRegex(query), $options: "i" };

  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const docs = await QrCode.find(q)
    .sort({ serialNo: 1 })
    .limit(limit)
    .select("serialNo type sku")
    .lean();

  return docs.map((d) => ({
    id: String(d._id),
    serialNo: d.serialNo,
    type: String(d.type),
    sku: d.sku ?? "",
  }));
}

export type CounterInventory = {
  masters: number;
  smalls: number;
  products: number;
  total: number;
};

export async function getCounterInventory(counterId: string): Promise<CounterInventory> {
  await connectDB();
  // Exclude scanned codes  they've been consumed by a khati and left the counter
  const notScanned = { $ne: "scanned" as const };
  const [masters, smalls, products] = await Promise.all([
    QrCode.countDocuments({ counterId, type: "master", status: notScanned }),
    QrCode.countDocuments({ counterId, type: "small", status: notScanned }),
    QrCode.countDocuments({ counterId, type: "product", status: notScanned }),
  ]);
  return { masters, smalls, products, total: masters + smalls + products };
}

// ---- counter inventory list ----

export type CounterCodeDTO = {
  id: string;
  serialNo: string;
  type: string;
  sku: string;
  status: string;
};

export async function listCounterCodes(
  counterId: string,
  pagination: Pagination,
  filter?: { type?: QrType },
  search?: string,
): Promise<Paginated<CounterCodeDTO>> {
  await connectDB();
  // Exclude scanned codes  consumed by a khati, no longer in counter's inventory
  const q: Record<string, unknown> = { counterId, status: { $ne: "scanned" as const } };
  if (filter?.type) q.type = filter.type;
  if (search) q.$or = [{ serialNo: { $regex: search, $options: "i" } }, { sku: { $regex: search, $options: "i" } }];
  const { page, pageSize } = pagination;
  const total = await QrCode.countDocuments(q);
  const docs = await QrCode.find(q)
    .sort({ serialNo: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .select("serialNo type sku status")
    .lean();
  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      serialNo: d.serialNo,
      type: String(d.type),
      sku: d.sku ?? "",
      status: String(d.status),
    })),
    total,
    pagination,
  );
}

// ---- counter dispatch history ----

export async function listCounterDispatches(
  counterId: string,
  pagination: Pagination,
  search?: string,
): Promise<Paginated<DispatchDTO>> {
  await connectDB();
  const q: Record<string, unknown> = { counterId };
  if (search) q.billNo = { $regex: search, $options: "i" };
  const { page, pageSize } = pagination;
  const total = await Dispatch.countDocuments(q);
  const docs = await Dispatch.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      billNo: d.billNo,
      counterLabel: "",
      unitCount: d.rootCount ?? d.masterCount ?? 0,
      totalCodes: d.totalCodes ?? 0,
      status: String(d.status),
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    })),
    total,
    pagination,
  );
}
