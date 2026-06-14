import "server-only";
import { connectDB } from "@/db/mongoose";
import { Redemption } from "@/models/Redemption";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { getSetting } from "@/services/settings";
import { paginated, type Pagination, type Paginated, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type RedemptionDTO = {
  id: string;
  khatiName: string;
  khatiPhone: string;
  points: number;
  status: string;
  otp?: string;
  createdAt: string;
};

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestRedemption(
  khatiId: string,
  points: number,
): Promise<{ id: string; otp: string }> {
  await connectDB();

  const minPts = await getSetting<number>("min_redemption_points", 0);
  if (points < 1) throw new Error("Enter a valid points amount.");
  if (minPts > 0 && points < minPts) {
    throw new Error(`Minimum redemption is ${minPts} points.`);
  }

  const khati = await User.findById(khatiId).select("points createdBy").lean();
  if (!khati) throw new Error("User not found.");
  if ((khati.points ?? 0) < points) throw new Error("You don't have enough points.");

  // One pending request at a time.
  const existing = await Redemption.findOne({ khatiId, status: "pending" });
  if (existing) throw new Error("You already have a pending redemption request.");

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  const r = await Redemption.create({
    khatiId: khatiId,
    counterId: khati.createdBy ?? undefined,
    points,
    status: "pending",
    otp,
    otpExpiresAt,
  });
  return { id: String(r._id), otp };
}

export async function listKhatiRedemptions(
  khatiId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<RedemptionDTO>> {
  await connectDB();
  const q = { khatiId };
  const total = await Redemption.countDocuments(q);
  const { page, pageSize } = pagination;
  const docs = await Redemption.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      khatiName: "",
      khatiPhone: "",
      points: d.points,
      status: d.status,
      otp: d.status === "pending" ? (d.otp ?? undefined) : undefined,
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    })),
    total,
    pagination,
  );
}

export async function listCounterRedemptions(
  counterId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  filter?: { status?: string; search?: string },
): Promise<Paginated<RedemptionDTO>> {
  await connectDB();
  const q: Record<string, unknown> = { counterId };
  if (filter?.status) q.status = filter.status;
  if (filter?.search) {
    // Search by khati name: find matching khati user IDs first
    const { User } = await import("@/models/User");
    const khatis = await User.find({ role: "khati", name: { $regex: filter.search, $options: "i" } }).select("_id").lean();
    q.khatiId = { $in: khatis.map((k) => k._id) };
  }
  const total = await Redemption.countDocuments(q);
  const { page, pageSize } = pagination;
  const docs = await Redemption.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate<{ khatiId: { name?: string; phone?: string } }>("khatiId", "name phone")
    .lean();

  return paginated(
    docs.map((d) => {
      const k = d.khatiId as { name?: string; phone?: string } | null;
      return {
        id: String(d._id),
        khatiName: k?.name || k?.phone || "—",
        khatiPhone: k?.phone || "",
        points: d.points,
        status: d.status,
        createdAt: (d.createdAt as Date)?.toISOString() ?? "",
      };
    }),
    total,
    pagination,
  );
}

export async function approveRedemption(id: string, counterId: string, otp: string): Promise<void> {
  await connectDB();
  const r = await Redemption.findOne({ _id: id, counterId, status: "pending" }).lean();
  if (!r) throw new Error("Redemption not found or already processed.");
  if (!r.otp || r.otp !== otp.trim()) throw new Error("Invalid OTP. Please check the code shown on the khati's screen.");
  if (!r.otpExpiresAt || new Date(r.otpExpiresAt as unknown as string) < new Date()) {
    throw new Error("OTP has expired. Ask the khati to submit a new redemption request.");
  }

  const result = await User.findOneAndUpdate(
    { _id: r.khatiId, points: { $gte: r.points } },
    { $inc: { points: -r.points } },
    { returnDocument: "after" },
  ).lean();
  if (!result) throw new Error("Khati has insufficient points.");

  await Redemption.findByIdAndUpdate(id, {
    $set: { status: "approved", processedBy: counterId },
  });

  // Ledger entry — redemption locks (deducts) points from the khati balance.
  PointTransaction.create({
    khatiId: r.khatiId,
    redemptionId: r._id,
    type: "redemption_lock",
    points: -r.points,
    balanceAfter: result.points ?? 0,
    description: "Points redeemed",
  }).catch((e) => console.error("[pt] Failed to write redemption PointTransaction:", e));
}

export async function rejectRedemption(id: string, counterId: string): Promise<void> {
  await connectDB();
  const r = await Redemption.findOne({ _id: id, counterId, status: "pending" }).lean();
  if (!r) throw new Error("Redemption not found or already processed.");
  await Redemption.findByIdAndUpdate(id, {
    $set: { status: "rejected", processedBy: counterId },
  });
}
