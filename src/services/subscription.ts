import "server-only";
import { connectDB } from "@/db/mongoose";
import { Subscription } from "@/models/Subscription";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { QrCode } from "@/models/QrCode";

export type SubscriptionDTO = {
  id: string;
  orgId: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxQrCodes: number;
  maxProducts: number;
  expiresAt: string | null;
  notes: string;
  usage: {
    users: number;
    qrCodes: number;
    products: number;
  };
};

export async function getOrgSubscription(orgId: string): Promise<SubscriptionDTO | null> {
  await connectDB();
  const sub = await Subscription.findOne({ orgId }).lean();
  if (!sub) return null;

  const [users, qrCodes, products] = await Promise.all([
    User.countDocuments({ orgId }),
    QrCode.countDocuments({ orgId }),
    Product.countDocuments({ orgId }),
  ]);

  return {
    id: String(sub._id),
    orgId: String(sub.orgId),
    plan: sub.plan ?? "free",
    status: sub.status ?? "active",
    maxUsers: sub.maxUsers ?? 50,
    maxQrCodes: sub.maxQrCodes ?? 5000,
    maxProducts: sub.maxProducts ?? 100,
    expiresAt: sub.expiresAt ? (sub.expiresAt as Date).toISOString() : null,
    notes: sub.notes ?? "",
    usage: { users, qrCodes, products },
  };
}

/** Returns an error string if the org has exceeded a limit, or null if ok. */
export async function checkLimit(
  orgId: string,
  resource: "users" | "qrCodes" | "products",
): Promise<string | null> {
  await connectDB();
  const sub = await Subscription.findOne({ orgId }).lean();
  if (!sub) return null; // No subscription record = no limits enforced

  if (sub.status !== "active") {
    return "Your organisation subscription is suspended. Please contact support.";
  }
  if (sub.expiresAt && (sub.expiresAt as Date) < new Date()) {
    return "Your subscription has expired. Please contact support to renew.";
  }

  const limitMap: Record<string, number> = {
    users: sub.maxUsers ?? 0,
    qrCodes: sub.maxQrCodes ?? 0,
    products: sub.maxProducts ?? 0,
  };

  const limit = limitMap[resource] ?? 0;
  if (limit === 0) return null; // 0 = unlimited

  const countMap: Record<string, () => Promise<number>> = {
    users: () => User.countDocuments({ orgId }),
    qrCodes: () => QrCode.countDocuments({ orgId }),
    products: () => Product.countDocuments({ orgId }),
  };

  const current = await countMap[resource]();
  if (current >= limit) {
    const label = { users: "user", qrCodes: "QR code", products: "product" }[resource];
    return `You have reached the ${label} limit (${limit}) for your plan. Please upgrade to continue.`;
  }

  return null;
}

export async function listAllSubscriptions(): Promise<SubscriptionDTO[]> {
  await connectDB();
  const subs = await Subscription.find().lean();
  const results = await Promise.all(
    subs.map(async (sub) => {
      const orgId = String(sub.orgId);
      const [users, qrCodes, products] = await Promise.all([
        User.countDocuments({ orgId }),
        QrCode.countDocuments({ orgId }),
        Product.countDocuments({ orgId }),
      ]);
      return {
        id: String(sub._id),
        orgId,
        plan: sub.plan ?? "free",
        status: sub.status ?? "active",
        maxUsers: sub.maxUsers ?? 50,
        maxQrCodes: sub.maxQrCodes ?? 5000,
        maxProducts: sub.maxProducts ?? 100,
        expiresAt: sub.expiresAt ? (sub.expiresAt as Date).toISOString() : null,
        notes: sub.notes ?? "",
        usage: { users, qrCodes, products },
      };
    }),
  );
  return results;
}
