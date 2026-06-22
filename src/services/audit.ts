import "server-only";
import { connectDB } from "@/db/mongoose";
import { AuditLog, type AuditAction } from "@/models/AuditLog";
import { User } from "@/models/User";

export type AuditEntry = {
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

/** Fire-and-forget audit write  never throws. */
export function logAudit(entry: AuditEntry): void {
  connectDB()
    .then(() => AuditLog.create(entry))
    .catch((e) => console.error("[audit] Failed to write audit log:", e));
}

export type AuditLogDTO = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type AuditPage = {
  items: AuditLogDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listAuditLogs(
  opts: { page?: number; pageSize?: number; q?: string; action?: string } = {},
): Promise<AuditPage> {
  await connectDB();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;

  const query: Record<string, unknown> = {};
  if (opts.action) query.action = opts.action;
  if (opts.q) query.actorName = { $regex: opts.q, $options: "i" };

  const total = await AuditLog.countDocuments(query);
  const docs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // Batch-resolve actor names for entries where the stored name is blank
  const missingIds = [
    ...new Set(
      docs
        .filter((d) => !d.actorName && d.actorId)
        .map((d) => String(d.actorId)),
    ),
  ];
  const nameMap: Record<string, string> = {};
  if (missingIds.length > 0) {
    const users = await User.find({ _id: { $in: missingIds } })
      .select("name")
      .lean();
    for (const u of users) nameMap[String(u._id)] = String(u.name || "");
  }

  return {
    items: docs.map((d) => ({
      id: String(d._id),
      actorName:
        String(d.actorName || nameMap[String(d.actorId)] || "System"),
      actorRole: String(d.actorRole ?? ""),
      action: String(d.action),
      entityType: String(d.entityType ?? ""),
      entityId: String(d.entityId ?? ""),
      meta: (d.meta as Record<string, unknown>) ?? {},
      createdAt: (d.createdAt as Date).toISOString(),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
