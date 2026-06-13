import "server-only";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { User } from "@/models/User";
import { Return } from "@/models/Return";
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
    $set: { status: "scanned", scannedByKhatiId: khatiId, scannedAt: new Date(), returned: false, returnedAt: null },
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
  counterName: string;
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
  const [khati, counter] = await Promise.all([
    User.findById(code.scannedByKhatiId).select("name points").lean(),
    User.findById(counterId).select("name").lean(),
  ]);
  if (!khati) throw new Error("Khati account not found.");

  const khatiName = khati.name ?? "Unknown";
  const counterName = counter?.name ?? "Unknown Counter";

  await User.findByIdAndUpdate(code.scannedByKhatiId, {
    $inc: { points: -pts },
  });

  await QrCode.findByIdAndUpdate(code._id, {
    $set: { status: "active", returned: true, returnedAt: new Date() },
    // scannedByKhatiId and scannedAt kept so the entry stays in khati history
  });

  await Return.create({
    counterId,
    khatiId: code.scannedByKhatiId,
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsReversed: pts,
    counterName,
    khatiName,
  });

  return {
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsReversed: pts,
    khatiName,
    counterName,
  };
}

export type ScanHistoryItem = {
  id: string;
  serialNo: string;
  sku: string;
  points: number;      // positive for scans, positive value for returns (sign applied in UI)
  scannedAt: string;
  isReturn: boolean;   // true = this is a return deduction entry
};

/**
 * Combined transaction history: QR scans (positive) + product returns (negative).
 * Merged in-memory so returns show as separate −pts entries alongside original scans.
 */
export async function listKhatiScans(
  khatiId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<ScanHistoryItem>> {
  await connectDB();

  const [scanDocs, returnDocs] = await Promise.all([
    QrCode.find({ scannedByKhatiId: khatiId })
      .select("serialNo sku rewardPoints scannedAt")
      .lean(),
    Return.find({ khatiId })
      .select("serialNo sku pointsReversed createdAt")
      .lean(),
  ]);

  const all: (ScanHistoryItem & { _ts: number })[] = [
    ...scanDocs.map((d) => ({
      id: String(d._id),
      serialNo: d.serialNo,
      sku: d.sku ?? "",
      points: d.rewardPoints ?? 0,
      scannedAt: (d.scannedAt as Date | null)?.toISOString() ?? "",
      isReturn: false,
      _ts: (d.scannedAt as Date | null)?.getTime() ?? 0,
    })),
    ...returnDocs.map((d) => ({
      id: `ret-${String(d._id)}`,
      serialNo: d.serialNo,
      sku: d.sku ?? "",
      points: d.pointsReversed,
      scannedAt: (d.createdAt as Date)?.toISOString() ?? "",
      isReturn: true,
      _ts: (d.createdAt as Date)?.getTime() ?? 0,
    })),
  ];

  all.sort((a, b) => b._ts - a._ts);

  const total = all.length;
  const { page, pageSize } = pagination;
  const pageItems = all
    .slice((page - 1) * pageSize, page * pageSize)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _ts, ...item }) => item);

  return paginated(pageItems, total, pagination);
}
