import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { Dispatch } from "@/models/Dispatch";
import { Sequence } from "@/models/Sequence";
import { User } from "@/models/User";
import { notifyDispatchCreated } from "@/services/wa-notify";
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
 * Save a dispatch draft: validate the scanned serials (any level  master box,
 * small box, or a single unique product code) are real and not already
 * dispatched, and record the bill with status "draft". Nothing is linked or
 * activated yet  that happens when the draft is dispatched from the list.
 */
export async function createDraftDispatch(input: {
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

  const rootIds = roots.map((r) => r._id as Types.ObjectId);

  const billNo = await nextBillNo();
  const dispatch = await Dispatch.create({
    billNo,
    counterId: counter._id,
    createdBy: input.createdBy,
    rootQrIds: rootIds,
    rootCount: rootIds.length,
    masterQrIds: rootIds, // mirror for backward compatibility
    masterCount: rootIds.length,
    totalCodes: rootIds.length,
    status: "draft",
  });

  return { billNo, dispatchId: String(dispatch._id), totalCodes: rootIds.length };
}

export type DraftDispatchDTO = {
  dispatchId: string;
  billNo: string;
  counterId: string;
  serials: string[];
};

/** Load a draft for editing (counter + scanned serials). */
export async function getDraftDispatch(id: string): Promise<DraftDispatchDTO | null> {
  await connectDB();
  const dispatch = await Dispatch.findById(id).lean();
  if (!dispatch || dispatch.status !== "draft") return null;

  const rootIds = dispatch.rootQrIds ?? [];
  const roots = await QrCode.find({ _id: { $in: rootIds } }).select("serialNo").lean();
  const bySerial = new Map(roots.map((r) => [String(r._id), r.serialNo]));

  return {
    dispatchId: String(dispatch._id),
    billNo: dispatch.billNo,
    counterId: String(dispatch.counterId),
    serials: rootIds.map((id) => bySerial.get(String(id))).filter((s): s is string => Boolean(s)),
  };
}

/**
 * Replace a draft's counter + serials (re-validated exactly like creating a
 * fresh draft). Only allowed while the bill is still a draft.
 */
export async function updateDraftDispatch(
  id: string,
  input: { counterId: string; serials: string[] },
): Promise<CreateDispatchResult> {
  await connectDB();

  const dispatch = await Dispatch.findById(id);
  if (!dispatch) throw new Error("Dispatch not found.");
  if (dispatch.status !== "draft") throw new Error("Dispatch is already finalized.");

  const counter = await User.findOne({ _id: input.counterId, role: "counter" });
  if (!counter) throw new Error("Select a valid counter.");

  const serials = Array.from(
    new Set(input.serials.map((s) => s.trim()).filter(Boolean)),
  );
  if (serials.length === 0) throw new Error("Scan at least one QR code.");

  const roots = await QrCode.find({ serialNo: { $in: serials } });
  const found = new Set(roots.map((r) => r.serialNo));
  const missing = serials.filter((s) => !found.has(s));
  if (missing.length) {
    throw new Error(`Not found: ${missing.join(", ")}`);
  }

  // Drafts never touch QrCode.counterId (only finalizing does), so any code
  // that already has one was dispatched by a different, already-finalized bill.
  const already = roots.filter((r) => r.counterId);
  if (already.length) {
    throw new Error(`Already dispatched: ${already.map((r) => r.serialNo).join(", ")}`);
  }

  const rootIds = roots.map((r) => r._id as Types.ObjectId);

  dispatch.counterId = counter._id;
  dispatch.rootQrIds = rootIds;
  dispatch.rootCount = rootIds.length;
  dispatch.masterQrIds = rootIds;
  dispatch.masterCount = rootIds.length;
  dispatch.totalCodes = rootIds.length;
  await dispatch.save();

  return { billNo: dispatch.billNo, dispatchId: String(dispatch._id), totalCodes: rootIds.length };
}

/**
 * Dispatch a saved draft: re-validate the roots are still undispatched, link
 * each root plus all of its descendants to the counter, activate them, mark
 * the bill "dispatched", and notify the counter.
 * (Should become transactional once the Mongo replica set is configured  see
 * Docs/SECURITY.md.)
 */
export async function dispatchDraft(dispatchId: string): Promise<CreateDispatchResult> {
  await connectDB();

  const dispatch = await Dispatch.findById(dispatchId).populate<{
    counterId: { _id: Types.ObjectId; phone?: string; name?: string };
  }>("counterId", "phone name");
  if (!dispatch) throw new Error("Dispatch not found.");
  if (dispatch.status !== "draft") throw new Error("Dispatch is already finalized.");

  const rootIds = (dispatch.rootQrIds ?? []) as Types.ObjectId[];
  const roots = await QrCode.find({ _id: { $in: rootIds } });
  const already = roots.filter((r) => r.counterId);
  if (already.length) {
    throw new Error(`Already dispatched: ${already.map((r) => r.serialNo).join(", ")}`);
  }

  const seen = new Set<string>(rootIds.map((id) => String(id)));
  const descendantIds = await collectUndispatchedDescendants(rootIds, seen);
  const allIds = [...rootIds, ...descendantIds];

  const counter = dispatch.counterId as unknown as { _id: Types.ObjectId; phone?: string; name?: string };

  await QrCode.updateMany(
    { _id: { $in: allIds } },
    { $set: { counterId: counter._id, dispatchId: dispatch._id, status: "active" } },
  );

  dispatch.totalCodes = allIds.length;
  dispatch.status = "dispatched";
  await dispatch.save();

  notifyDispatchCreated(counter.phone, counter.name, dispatch.billNo, allIds.length);

  return { billNo: dispatch.billNo, dispatchId: String(dispatch._id), totalCodes: allIds.length };
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
  counterId: string;
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

  const c = d.counterId as { _id?: unknown; name?: string; email?: string; phone?: string } | null;
  return {
    billNo: d.billNo,
    counterId: c?._id ? String(c._id) : "",
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
 * Excludes codes that are descendants of already-selected parent codes.
 */
export async function searchDispatchableCodes(input: {
  type?: QrType;
  query?: string;
  limit?: number;
  excludeDescendantsOf?: string[];
}): Promise<DispatchableCodeDTO[]> {
  await connectDB();
  const q: Record<string, unknown> = { counterId: null };
  if (input.type) q.type = input.type;
  const query = (input.query ?? "").trim();
  if (query) q.serialNo = { $regex: escapeRegex(query), $options: "i" };

  // If parent serials are provided, collect their descendants to exclude
  let excludeIds: Types.ObjectId[] = [];
  if (input.excludeDescendantsOf?.length) {
    const parents = await QrCode.find({ serialNo: { $in: input.excludeDescendantsOf } })
      .select("_id")
      .lean();
    const parentIds = parents.map((p) => p._id as Types.ObjectId);
    const seen = new Set<string>(parentIds.map((id) => String(id)));
    excludeIds = await collectUndispatchedDescendants(parentIds, seen);
  }
  if (excludeIds.length > 0) {
    q._id = { $nin: excludeIds };
  }

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
  const cid = new Types.ObjectId(counterId);
  // Show every code dispatched to the counter (active / scanned / returned alike);
  // the inventory list surfaces each code's status. Counts = total dispatched per type.
  const baseFilter = { counterId: cid };
  const [masters, smalls, products] = await Promise.all([
    QrCode.countDocuments({ ...baseFilter, type: "master" }),
    QrCode.countDocuments({ ...baseFilter, type: "small" }),
    QrCode.countDocuments({ ...baseFilter, type: "product" }),
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
  // Show every code dispatched to the counter; the status badge tells the counter
  // whether each code is active, scanned by a khati, or returned.
  const cid = new Types.ObjectId(counterId);
  const q: Record<string, unknown> = { counterId: cid };
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
  const cid = new Types.ObjectId(counterId);
  const q: Record<string, unknown> = { counterId: cid, status: "dispatched" };
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
