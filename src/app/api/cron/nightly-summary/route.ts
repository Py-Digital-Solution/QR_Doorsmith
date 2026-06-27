import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { QrCode } from "@/models/QrCode";
import { Return } from "@/models/Return";
import { Redemption } from "@/models/Redemption";
import { PointTransaction } from "@/models/PointTransaction";
import { waSend } from "@/services/whatsapp";
import { istStartOfToday } from "@/lib/datetime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lean = { _id: unknown; name?: string; phone?: string; points?: number; createdBy?: unknown; kycStatus?: string };
const s = (v: unknown) => String(v ?? "");

export async function GET(req: Request) {
  // Verify cron secret to prevent public triggering
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const todayStart = istStartOfToday();

  // ── Load the people graph ───────────────────────────────────────────────
  const [khatis, counters, salesStaff, admins] = await Promise.all([
    User.find({ role: "khati", status: "active" }).select("_id name phone points createdBy").lean<Lean[]>(),
    User.find({ role: "counter" }).select("_id name phone createdBy").lean<Lean[]>(),
    User.find({ role: { $in: ["sales_rep", "distributor"] } }).select("_id name phone").lean<Lean[]>(),
    User.find({ role: "admin" }).select("_id name phone").lean<Lean[]>(),
  ]);

  // ── Today's activity, pre-aggregated ────────────────────────────────────
  const [scansByCounter, pointsByKhati, returnsByCounter, pendingByCounter] = await Promise.all([
    QrCode.aggregate([
      { $match: { status: "scanned", scannedAt: { $gte: todayStart } } },
      { $group: { _id: "$counterId", count: { $sum: 1 } } },
    ]),
    PointTransaction.aggregate([
      { $match: { createdAt: { $gte: todayStart }, points: { $gt: 0 } } },
      { $group: { _id: "$khatiId", total: { $sum: "$points" } } },
    ]),
    Return.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: "$counterId", count: { $sum: 1 } } },
    ]),
    Redemption.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: "$counterId", count: { $sum: 1 } } },
    ]),
  ]);

  const scanMap = new Map(scansByCounter.map((r) => [s(r._id), r.count as number]));
  const pointKhatiMap = new Map(pointsByKhati.map((r) => [s(r._id), r.total as number]));
  const returnMap = new Map(returnsByCounter.map((r) => [s(r._id), r.count as number]));
  const pendingMap = new Map(pendingByCounter.map((r) => [s(r._id), r.count as number]));

  // Roll khati→counter so we can sum today's points per counter.
  const pointsByCounter = new Map<string, number>();
  const khatiCountByCounter = new Map<string, number>();
  for (const k of khatis) {
    const c = s(k.createdBy);
    khatiCountByCounter.set(c, (khatiCountByCounter.get(c) ?? 0) + 1);
    const p = pointKhatiMap.get(s(k._id)) ?? 0;
    if (p) pointsByCounter.set(c, (pointsByCounter.get(c) ?? 0) + p);
  }

  // Pending KYC counts by counter (for staff awareness).
  const pendingKycByCounter = new Map<string, number>();
  for (const k of khatis) {
    if (k.kycStatus && k.kycStatus !== "approved" && k.kycStatus !== "rejected") {
      const c = s(k.createdBy);
      pendingKycByCounter.set(c, (pendingKycByCounter.get(c) ?? 0) + 1);
    }
  }

  let sent = 0;
  let failed = 0;
  const send = async (phone: string | undefined, msg: string, type: string) => {
    if (!phone) return;
    try { await waSend(phone, msg, type); sent++; } catch { failed++; }
  };

  // ── 1) Khati daily summary ──────────────────────────────────────────────
  for (const k of khatis) {
    const todayPoints = pointKhatiMap.get(s(k._id)) ?? 0;
    const balance = k.points ?? 0;
    if (todayPoints === 0 && balance === 0) continue; // avoid spam
    await send(k.phone,
      `📊 *DoorSmith दैनिक सारांश | Daily Summary*\n\n` +
      `नमस्ते *${k.name}*! आज की रिपोर्ट:\n` +
      `Hello *${k.name}*! Here is your daily report:\n\n` +
      `🌟 *आज अर्जित अंक | Points earned today:* ${todayPoints}\n` +
      `💰 *कुल अंक शेष | Total balance:* ${balance}\n\n` +
      `अपने अंक रिडीम करने के लिए DoorSmith खोलें। 🎁\n` +
      `Open DoorSmith to redeem your points.`,
      "nightly_summary");
  }

  // ── 2) Counter daily summary ────────────────────────────────────────────
  const counterRollup = new Map<string, { scans: number; points: number; returns: number; pending: number }>();
  for (const c of counters) {
    const id = s(c._id);
    const scans = scanMap.get(id) ?? 0;
    const points = pointsByCounter.get(id) ?? 0;
    const returns = returnMap.get(id) ?? 0;
    const pending = pendingMap.get(id) ?? 0;
    const pendingKyc = pendingKycByCounter.get(id) ?? 0;
    // attribute to the counter's sales rep for the next rollup
    const salesId = s(c.createdBy);
    const agg = counterRollup.get(salesId) ?? { scans: 0, points: 0, returns: 0, pending: 0 };
    agg.scans += scans; agg.points += points; agg.returns += returns; agg.pending += pending;
    counterRollup.set(salesId, agg);

    if (scans === 0 && returns === 0 && pending === 0 && pendingKyc === 0) continue;
    await send(c.phone,
      `📊 *DoorSmith काउंटर सारांश | Counter Summary*\n\n` +
      `नमस्ते *${c.name}*! आज की गतिविधि:\n` +
      `Hello *${c.name}*! Today's activity:\n\n` +
      `🔢 *आज स्कैन | Scans today:* ${scans}\n` +
      `🌟 *अंक वितरित | Points distributed:* ${points}\n` +
      `↩️ *रिटर्न | Returns:* ${returns}\n` +
      `⏳ *लंबित रिडेम्पशन | Pending redemptions:* ${pending}\n` +
      `🪪 *लंबित KYC | Pending KYC:* ${pendingKyc}`,
      "nightly_summary_counter");
  }

  // ── 3) Sales rep / distributor network summary ──────────────────────────
  const counterCountBySales = new Map<string, number>();
  for (const c of counters) {
    const sid = s(c.createdBy);
    counterCountBySales.set(sid, (counterCountBySales.get(sid) ?? 0) + 1);
  }
  for (const rep of salesStaff) {
    const id = s(rep._id);
    const agg = counterRollup.get(id) ?? { scans: 0, points: 0, returns: 0, pending: 0 };
    const numCounters = counterCountBySales.get(id) ?? 0;
    if (agg.scans === 0 && agg.returns === 0 && agg.pending === 0) continue;
    await send(rep.phone,
      `📊 *DoorSmith नेटवर्क सारांश | Network Summary*\n\n` +
      `नमस्ते *${rep.name}*! आज आपके नेटवर्क की रिपोर्ट:\n` +
      `Hello *${rep.name}*! Today's network report:\n\n` +
      `🏪 *काउंटर | Counters:* ${numCounters}\n` +
      `🔢 *आज स्कैन | Scans today:* ${agg.scans}\n` +
      `🌟 *अंक वितरित | Points distributed:* ${agg.points}\n` +
      `↩️ *रिटर्न | Returns:* ${agg.returns}\n` +
      `⏳ *लंबित रिडेम्पशन | Pending redemptions:* ${agg.pending}`,
      "nightly_summary_sales");
  }

  // ── 4) Admin global summary ─────────────────────────────────────────────
  const totalScans = [...scanMap.values()].reduce((a, b) => a + b, 0);
  const totalPoints = [...pointKhatiMap.values()].reduce((a, b) => a + b, 0);
  const totalReturns = [...returnMap.values()].reduce((a, b) => a + b, 0);
  const totalPending = [...pendingMap.values()].reduce((a, b) => a + b, 0);
  const totalPendingKyc = [...pendingKycByCounter.values()].reduce((a, b) => a + b, 0);
  for (const admin of admins) {
    await send(admin.phone,
      `📊 *DoorSmith प्रबंधन सारांश | Admin Summary*\n\n` +
      `नमस्ते *${admin.name}*! आज का पूरा सारांश:\n` +
      `Hello *${admin.name}*! Today's full summary:\n\n` +
      `👷 *सक्रिय कारीगर | Active karigars:* ${khatis.length}\n` +
      `🏪 *काउंटर | Counters:* ${counters.length}\n` +
      `🔢 *आज स्कैन | Scans today:* ${totalScans}\n` +
      `🌟 *अंक वितरित | Points distributed:* ${totalPoints}\n` +
      `↩️ *रिटर्न | Returns:* ${totalReturns}\n` +
      `⏳ *लंबित रिडेम्पशन | Pending redemptions:* ${totalPending}\n` +
      `🪪 *लंबित KYC | Pending KYC:* ${totalPendingKyc}`,
      "nightly_summary_admin");
  }

  return NextResponse.json({
    ok: true,
    counts: { khatis: khatis.length, counters: counters.length, sales: salesStaff.length, admins: admins.length },
    sent,
    failed,
    runAt: new Date().toISOString(),
  });
}
