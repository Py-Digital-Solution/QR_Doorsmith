import "server-only";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { Dispatch } from "@/models/Dispatch";
import { Sequence } from "@/models/Sequence";
import { User } from "@/models/User";
import { formatBillNo } from "@/lib/qr";
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

/**
 * Create a dispatch bill: validate the scanned master serials, link every
 * master + its small + product descendants to the chosen counter, activate
 * them, and record the bill. (Should become transactional once the Mongo
 * replica set is configured — see Docs/SECURITY.md.)
 */
export async function createDispatch(input: {
  createdBy: string;
  counterId: string;
  masterSerials: string[];
}): Promise<CreateDispatchResult> {
  await connectDB();

  const counter = await User.findOne({ _id: input.counterId, role: "counter" });
  if (!counter) throw new Error("Select a valid counter.");

  const serials = Array.from(
    new Set(input.masterSerials.map((s) => s.trim()).filter(Boolean)),
  );
  if (serials.length === 0) throw new Error("Scan at least one master box QR.");

  const masters = await QrCode.find({ serialNo: { $in: serials }, type: "master" });
  const found = new Set(masters.map((m) => m.serialNo));
  const missing = serials.filter((s) => !found.has(s));
  if (missing.length) {
    throw new Error(`Not a master box QR or not found: ${missing.join(", ")}`);
  }

  const already = masters.filter((m) => m.counterId);
  if (already.length) {
    throw new Error(`Already dispatched: ${already.map((m) => m.serialNo).join(", ")}`);
  }

  const masterIds = masters.map((m) => m._id);
  const smalls = await QrCode.find({ parentQrId: { $in: masterIds } }).select("_id");
  const smallIds = smalls.map((s) => s._id);
  const products = await QrCode.find({ parentQrId: { $in: smallIds } }).select("_id");
  const productIds = products.map((p) => p._id);
  const allIds = [...masterIds, ...smallIds, ...productIds];

  const billNo = await nextBillNo();
  const dispatch = await Dispatch.create({
    billNo,
    counterId: counter._id,
    createdBy: input.createdBy,
    masterQrIds: masterIds,
    masterCount: masterIds.length,
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
  masterCount: number;
  totalCodes: number;
  status: string;
  createdAt: string;
};

function counterLabel(c: { name?: string; email?: string } | null): string {
  return c?.name || c?.email || "—";
}

export async function listDispatches(
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<DispatchDTO>> {
  await connectDB();
  const { page, pageSize } = pagination;
  const total = await Dispatch.countDocuments({});
  const docs = await Dispatch.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ counterId: { name?: string; email?: string } }>("counterId", "name email")
    .lean();

  const items: DispatchDTO[] = docs.map((d) => ({
    id: String(d._id),
    billNo: d.billNo,
    counterLabel: counterLabel(d.counterId as { name?: string; email?: string } | null),
    masterCount: d.masterCount ?? 0,
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
  masterCount: number;
  totalCodes: number;
  masters: { serialNo: string; sku: string }[];
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

  const masters = await QrCode.find({ _id: { $in: d.masterQrIds } })
    .select("serialNo sku")
    .lean();

  const c = d.counterId as { name?: string; email?: string; phone?: string } | null;
  return {
    billNo: d.billNo,
    counterName: c?.name || "—",
    counterContact: c?.email || c?.phone || "",
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    masterCount: d.masterCount ?? 0,
    totalCodes: d.totalCodes ?? 0,
    masters: masters.map((m) => ({ serialNo: m.serialNo, sku: m.sku ?? "" })),
  };
}

export type CounterInventory = {
  masters: number;
  smalls: number;
  products: number;
  total: number;
};

export async function getCounterInventory(counterId: string): Promise<CounterInventory> {
  await connectDB();
  const [masters, smalls, products] = await Promise.all([
    QrCode.countDocuments({ counterId, type: "master" }),
    QrCode.countDocuments({ counterId, type: "small" }),
    QrCode.countDocuments({ counterId, type: "product" }),
  ]);
  return { masters, smalls, products, total: masters + smalls + products };
}
