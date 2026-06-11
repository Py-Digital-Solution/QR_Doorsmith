import "server-only";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { User } from "@/models/User";
import { paginated, type Pagination, type Paginated, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type KhatiStats = {
  points: number;
  lifetimePoints: number;
  counterId: string;
};

export async function getKhatiStats(khatiId: string): Promise<KhatiStats> {
  await connectDB();
  const user = await User.findById(khatiId).select("points lifetimePoints createdBy").lean();
  return {
    points: user?.points ?? 0,
    lifetimePoints: user?.lifetimePoints ?? 0,
    counterId: String(user?.createdBy ?? ""),
  };
}

export type ScanResult = {
  serialNo: string;
  sku: string;
  pointsEarned: number;
  newBalance: number;
};

/**
 * Validate and record a product QR scan for a khati.
 * The code must be active, type=product, and belong to the khati's counter.
 */
export async function processQrScan(
  khatiId: string,
  serialNo: string,
): Promise<ScanResult> {
  await connectDB();

  const code = await QrCode.findOne({ serialNo: serialNo.trim() }).lean();
  if (!code) throw new Error("QR code not found.");
  if (code.type !== "product") throw new Error("Only product QR codes earn points.");
  if (code.status === "scanned") throw new Error("This QR code has already been scanned.");
  if (code.status !== "active") throw new Error("QR code is not active — it must be dispatched to a counter first.");
  if (!code.counterId) throw new Error("QR code has not been dispatched to a counter.");

  const khati = await User.findById(khatiId).select("createdBy points").lean();
  if (!khati) throw new Error("Khati account not found.");
  if (String(code.counterId) !== String(khati.createdBy)) {
    throw new Error("This QR code does not belong to your counter.");
  }

  const pts = code.rewardPoints ?? 0;

  await QrCode.findByIdAndUpdate(code._id, {
    $set: { status: "scanned", scannedByKhatiId: khatiId, scannedAt: new Date() },
  });

  const updated = await User.findByIdAndUpdate(
    khatiId,
    { $inc: { points: pts, lifetimePoints: pts } },
    { returnDocument: "after" },
  ).lean();

  return {
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsEarned: pts,
    newBalance: updated?.points ?? pts,
  };
}

export type ReturnResult = {
  serialNo: string;
  sku: string;
  pointsReversed: number;
  khatiName: string;
};

/**
 * Process a product return at a counter.
 * Reverses the khati's reward points and reactivates the QR code for resale.
 */
export async function processQrReturn(
  counterId: string,
  serialNo: string,
): Promise<ReturnResult> {
  await connectDB();

  const code = await QrCode.findOne({ serialNo: serialNo.trim() }).lean();
  if (!code) throw new Error("QR code not found.");
  if (code.type !== "product") throw new Error("Only product QR codes can be returned.");
  if (code.status !== "scanned") throw new Error("This code has not been scanned — nothing to return.");
  if (!code.counterId || String(code.counterId) !== counterId) {
    throw new Error("This QR code does not belong to your counter.");
  }
  if (!code.scannedByKhatiId) throw new Error("No khati record found for this code.");

  const pts = code.rewardPoints ?? 0;
  const khati = await User.findById(code.scannedByKhatiId).select("name points").lean();
  if (!khati) throw new Error("Khati account not found.");

  await User.findByIdAndUpdate(code.scannedByKhatiId, {
    $inc: { points: -pts },
  });

  await QrCode.findByIdAndUpdate(code._id, {
    $set: { status: "active", scannedByKhatiId: null, scannedAt: null },
  });

  return {
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsReversed: pts,
    khatiName: khati.name ?? "Unknown",
  };
}

export type ScanHistoryItem = {
  id: string;
  serialNo: string;
  sku: string;
  pointsEarned: number;
  scannedAt: string;
};

export async function listKhatiScans(
  khatiId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<ScanHistoryItem>> {
  await connectDB();
  const q = { scannedByKhatiId: khatiId };
  const total = await QrCode.countDocuments(q);
  const { page, pageSize } = pagination;
  const docs = await QrCode.find(q)
    .sort({ scannedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .select("serialNo sku rewardPoints scannedAt")
    .lean();

  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      serialNo: d.serialNo,
      sku: d.sku ?? "",
      pointsEarned: d.rewardPoints ?? 0,
      scannedAt: (d.scannedAt as Date | null)?.toISOString() ?? "",
    })),
    total,
    pagination,
  );
}
