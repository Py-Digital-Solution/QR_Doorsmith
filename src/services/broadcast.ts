import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { Broadcast } from "@/models/Broadcast";
import { waSend } from "@/services/whatsapp";

/** Roles an admin may target with a promotion. */
export const AUDIENCE_ROLES = ["khati", "counter", "sales_rep", "distributor"] as const;
export type AudienceRole = (typeof AUDIENCE_ROLES)[number];

export const AUDIENCE_LABEL: Record<AudienceRole, string> = {
  khati: "Karigars",
  counter: "Counters",
  sales_rep: "Sales reps",
  distributor: "Distributors",
};

// Small batches with no in-function sleep keep each drain well under serverless
// time limits; pacing (anti-ban) comes from the polling/cron interval instead.
const BATCH = 10;

function validRoles(roles: string[]): string[] {
  return [...new Set(roles)].filter((r) => (AUDIENCE_ROLES as readonly string[]).includes(r));
}

/** Active users in the given roles that actually have a phone number. */
function audienceQuery(roles: string[]): Record<string, unknown> {
  return {
    role: { $in: roles },
    status: "active",
    phone: { $exists: true, $nin: [null, ""] },
  };
}

export async function countAudience(roles: string[]): Promise<number> {
  await connectDB();
  const valid = validRoles(roles);
  if (valid.length === 0) return 0;
  return User.countDocuments(audienceQuery(valid));
}

export async function createBroadcast(input: {
  roles: string[];
  message: string;
  imageUrl?: string;
  actorId: string;
  actorName: string;
}): Promise<{ id: string; total: number }> {
  await connectDB();
  const roles = validRoles(input.roles);
  if (roles.length === 0) throw new Error("Select at least one audience.");
  const message = input.message.trim();
  if (!message) throw new Error("Message is required.");

  const total = await User.countDocuments(audienceQuery(roles));
  if (total === 0) throw new Error("No recipients match the selected audience.");

  const b = await Broadcast.create({
    audienceRoles: roles,
    message,
    imageUrl: input.imageUrl,
    status: "queued",
    total,
    createdBy: input.actorId,
    createdByName: input.actorName,
  });
  return { id: String(b._id), total };
}

export type DrainResult = {
  active: boolean;
  broadcastId?: string;
  total?: number;
  sent?: number;
  failed?: number;
  done?: boolean;
};

/**
 * Send the next batch of the oldest in-flight broadcast. Returns quickly so it
 * can be called repeatedly (client polling + cron). `active: false` means there
 * is nothing left to send.
 */
export async function drainNextBatch(): Promise<DrainResult> {
  await connectDB();
  const b = await Broadcast.findOne({ status: { $in: ["queued", "sending"] } })
    .sort({ createdAt: 1 })
    .lean();
  if (!b) return { active: false };

  const oldCursor = (b.cursor as Types.ObjectId | null) ?? null;
  const q = audienceQuery(b.audienceRoles as string[]);
  if (oldCursor) q._id = { $gt: oldCursor };
  const batch = await User.find(q).select("_id phone").sort({ _id: 1 }).limit(BATCH).lean();

  if (batch.length === 0) {
    await Broadcast.updateOne({ _id: b._id }, { $set: { status: "completed" } });
    return { active: true, broadcastId: String(b._id), total: b.total, sent: b.sent, failed: b.failed, done: true };
  }

  const newCursor = batch[batch.length - 1]._id as Types.ObjectId;
  // Atomically claim this window: the cursor only advances if it still equals
  // what we read, so two concurrent drainers (admin poll + cron) can never send
  // the same batch twice.
  const claim = await Broadcast.findOneAndUpdate(
    { _id: b._id, cursor: oldCursor, status: { $in: ["queued", "sending"] } },
    { $set: { cursor: newCursor, status: "sending" } },
  );
  if (!claim) {
    return { active: true, broadcastId: String(b._id), total: b.total, sent: b.sent, failed: b.failed, done: false };
  }

  let sent = 0;
  let failed = 0;
  for (const u of batch) {
    try {
      await waSend(String(u.phone), b.message, "promotion", b.imageUrl ?? undefined);
      sent++;
    } catch {
      failed++;
    }
  }

  const update: Record<string, unknown> = { $inc: { sent, failed } };
  if (batch.length < BATCH) update.$set = { status: "completed" };
  const updated = await Broadcast.findByIdAndUpdate(b._id, update, { returnDocument: "after" }).lean();

  return {
    active: true,
    broadcastId: String(b._id),
    total: updated?.total ?? b.total,
    sent: updated?.sent ?? b.sent,
    failed: updated?.failed ?? b.failed,
    done: updated?.status === "completed",
  };
}

/** Send a one-off test message to a single number (no Broadcast record). */
export async function sendTestMessage(phone: string, message: string, imageUrl?: string): Promise<void> {
  await waSend(phone, message, "promotion_test", imageUrl);
}

export type BroadcastDTO = {
  id: string;
  audienceRoles: string[];
  message: string;
  imageUrl?: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  createdByName: string;
  createdAt: string;
};

export async function listBroadcasts(limit = 20): Promise<BroadcastDTO[]> {
  await connectDB();
  const docs = await Broadcast.find().sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: String(d._id),
    audienceRoles: (d.audienceRoles as string[]) ?? [],
    message: d.message,
    imageUrl: d.imageUrl ?? undefined,
    status: String(d.status),
    total: d.total ?? 0,
    sent: d.sent ?? 0,
    failed: d.failed ?? 0,
    createdByName: d.createdByName ?? "",
    createdAt: (d.createdAt as Date)?.toISOString() ?? "",
  }));
}
