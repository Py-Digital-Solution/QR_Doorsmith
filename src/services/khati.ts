import "server-only";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { User } from "@/models/User";
import { Return } from "@/models/Return";
import { PointTransaction } from "@/models/PointTransaction";
import { paginated, type Pagination, type Paginated, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type KhatiStats = {
  points: number;
  lifetimePoints: number;
  counterId: string;
};

export async function getKhatiStats(khatiId: string): Promise<KhatiStats> {
  await connectDB();
  const user = await User.findById(khatiId).select("points lifetimePoints counterId createdBy").lean();
  return {
    points: user?.points ?? 0,
    lifetimePoints: user?.lifetimePoints ?? 0,
    counterId: String(user?.counterId ?? user?.createdBy ?? ""),
  };
}

export type ScanResult = {
  serialNo: string;
  sku: string;
  pointsEarned: number;
  newBalance: number;
  /** "product" = single code scanned; "small" = full small-box bulk scan. */
  type: "product" | "small";
  /** Number of product codes credited (only set for small-box scans). */
  productsScanned?: number;
};

/**
 * Validate and record a QR scan for a khati.
 * Accepts product codes (single point award) and small-box codes (bulk award
 * for all active product children of that small box).
 */
export async function processQrScan(
  khatiId: string,
  serialNo: string,
): Promise<ScanResult> {
  await connectDB();

  const code = await QrCode.findOne({ serialNo: serialNo.trim() }).lean();
  if (!code) throw new Error("QR code not found.");
  if (code.type === "master") throw new Error("Master box QR codes cannot be scanned for points.");
  if (code.type !== "product" && code.type !== "small") throw new Error("Only product or small box QR codes earn points.");
  if (code.status === "scanned") throw new Error("This QR code has already been scanned.");
  if (code.status !== "active") throw new Error("QR code is not active — it must be dispatched to a counter first.");
  if (!code.counterId) throw new Error("QR code has not been dispatched to a counter.");

  const khati = await User.findById(khatiId).select("counterId createdBy points").lean();
  if (!khati) throw new Error("Khati account not found.");
  // counterId is the authoritative counter link; fall back to createdBy for legacy rows.
  const khatiCounterId = String(khati.counterId ?? khati.createdBy ?? "");
  if (String(code.counterId) !== khatiCounterId) {
    throw new Error("This QR code does not belong to your counter.");
  }

  const now = new Date();

  // ── Small-box scan: credit only the still-unscanned product children ──
  // Already-scanned products (status !== "active") are deliberately excluded so
  // they stay owned by the khati who scanned them first. Ownership is tracked
  // per product via scannedByKhatiId, so returns reverse points from the exact
  // owner — never from whoever happened to scan the box.
  if (code.type === "small") {
    const productCodes = await QrCode.find({
      parentQrId: code._id,
      type: "product",
      status: "active",
      counterId: code.counterId, // never assign a child re-dispatched elsewhere
    }).lean();

    if (productCodes.length === 0) {
      throw new Error("No unscanned products remain in this small box.");
    }

    const totalPts = productCodes.reduce((sum, c) => sum + (c.rewardPoints ?? 0), 0);

    await Promise.all([
      // Mark every product code as scanned
      QrCode.updateMany(
        { _id: { $in: productCodes.map((c) => c._id) } },
        { $set: { status: "scanned", scannedByKhatiId: khatiId, scannedAt: now, returned: false, returnedAt: null } },
      ),
      // Mark the small box itself as scanned for traceability
      QrCode.findByIdAndUpdate(code._id, {
        $set: { status: "scanned", scannedByKhatiId: khatiId, scannedAt: now },
      }),
    ]);

    const updated = await User.findByIdAndUpdate(
      khatiId,
      { $inc: { points: totalPts, lifetimePoints: totalPts } },
      { returnDocument: "after" },
    ).lean();
    const newBal = updated?.points ?? totalPts;
    PointTransaction.create({
      khatiId, qrCodeId: code._id, type: "scan_small_box",
      points: totalPts, balanceAfter: newBal,
      description: `Small box scan: ${productCodes.length} products`,
      sku: code.sku, serialNo: code.serialNo,
    }).catch((e) => console.error("[pt] Failed to write PointTransaction:", e));

    return {
      serialNo: code.serialNo,
      sku: code.sku ?? "",
      pointsEarned: totalPts,
      newBalance: newBal,
      type: "small",
      productsScanned: productCodes.length,
    };
  }

  // ── Single product scan ──
  const pts = code.rewardPoints ?? 0;

  await QrCode.findByIdAndUpdate(code._id, {
    $set: { status: "scanned", scannedByKhatiId: khatiId, scannedAt: now, returned: false, returnedAt: null },
  });

  const updated = await User.findByIdAndUpdate(
    khatiId,
    { $inc: { points: pts, lifetimePoints: pts } },
    { returnDocument: "after" },
  ).lean();
  const newBalance = updated?.points ?? pts;
  PointTransaction.create({
    khatiId, qrCodeId: code._id, type: "scan_product",
    points: pts, balanceAfter: newBalance,
    description: `Product scan`,
    sku: code.sku, serialNo: code.serialNo,
  }).catch((e) => console.error("[pt] Failed to write PointTransaction:", e));

  return {
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsEarned: pts,
    newBalance: newBalance,
    type: "product",
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
  actorId: string,
  serialNo: string,
  opts: { adminOverride?: boolean } = {},
): Promise<ReturnResult> {
  await connectDB();

  const code = await QrCode.findOne({ serialNo: serialNo.trim() }).lean();
  if (!code) throw new Error("QR code not found.");
  if (code.type !== "product") throw new Error("Only product QR codes can be returned.");
  if (code.status !== "scanned") throw new Error("This code has not been scanned — nothing to return.");
  if (!code.counterId) throw new Error("This product was never dispatched to a counter.");
  // A counter may only return its own codes. An admin can return any code and
  // the return is booked against the counter the product actually belongs to.
  if (!opts.adminOverride && String(code.counterId) !== actorId) {
    throw new Error("This QR code does not belong to your counter.");
  }
  if (!code.scannedByKhatiId) throw new Error("No khati record found for this code.");

  const counterId = opts.adminOverride ? String(code.counterId) : actorId;
  const pts = code.rewardPoints ?? 0;
  const [khati, counter] = await Promise.all([
    User.findById(code.scannedByKhatiId).select("name points").lean(),
    User.findById(counterId).select("name").lean(),
  ]);
  if (!khati) throw new Error("Khati account not found.");

  const khatiName = khati.name ?? "Unknown";
  const counterName = counter?.name ?? "Unknown Counter";

  const updatedKhati = await User.findByIdAndUpdate(
    code.scannedByKhatiId,
    { $inc: { points: -pts } },
    { returnDocument: "after" },
  ).lean();

  await QrCode.findByIdAndUpdate(code._id, {
    $set: { status: "active", returned: true, returnedAt: new Date() },
    // scannedByKhatiId and scannedAt kept so the entry stays in khati history
  });

  const ret = await Return.create({
    counterId,
    khatiId: code.scannedByKhatiId,
    serialNo: code.serialNo,
    sku: code.sku ?? "",
    pointsReversed: pts,
    counterName,
    khatiName,
  });

  PointTransaction.create({
    khatiId: code.scannedByKhatiId,
    qrCodeId: code._id,
    returnId: ret._id,
    type: "return_reversal",
    points: -pts,
    balanceAfter: updatedKhati?.points ?? 0,
    description: `Return reversal by ${counterName}`,
    sku: code.sku, serialNo: code.serialNo,
  }).catch((e) => console.error("[pt] Failed to write PointTransaction:", e));

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
  search?: string,
): Promise<Paginated<ScanHistoryItem>> {
  await connectDB();

  const searchFilter = search
    ? { $or: [{ serialNo: { $regex: search, $options: "i" } }, { sku: { $regex: search, $options: "i" } }] }
    : {};

  const [scanDocs, returnDocs] = await Promise.all([
    QrCode.find({ scannedByKhatiId: khatiId, ...searchFilter })
      .select("serialNo sku rewardPoints scannedAt type parentQrId")
      .lean(),
    Return.find({ khatiId, ...searchFilter })
      .select("serialNo sku pointsReversed createdAt")
      .lean(),
  ]);

  // A small-box scan credits the sum of its product children — never the box's
  // own rewardPoints snapshot. So in history we show ONE row per scanned box
  // carrying that real total, and fold its child products into it (rather than
  // listing the box AND every child, which double-counts).
  const scannedBoxIds = scanDocs.filter((d) => d.type === "small").map((d) => d._id);
  const boxIdSet = new Set(scannedBoxIds.map((id) => String(id)));
  const boxTotals = new Map<string, number>();
  if (scannedBoxIds.length > 0) {
    const children = await QrCode.find({
      scannedByKhatiId: khatiId,
      type: "product",
      parentQrId: { $in: scannedBoxIds },
    })
      .select("parentQrId rewardPoints")
      .lean();
    for (const c of children) {
      const key = String(c.parentQrId);
      boxTotals.set(key, (boxTotals.get(key) ?? 0) + (c.rewardPoints ?? 0));
    }
  }

  const all: (ScanHistoryItem & { _ts: number })[] = [
    ...scanDocs
      // Drop child products of a scanned small box — represented by the box row.
      .filter((d) => !(d.type === "product" && d.parentQrId && boxIdSet.has(String(d.parentQrId))))
      .map((d) => ({
        id: String(d._id),
        serialNo: d.serialNo,
        sku: d.sku ?? "",
        points: d.type === "small" ? (boxTotals.get(String(d._id)) ?? 0) : (d.rewardPoints ?? 0),
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
