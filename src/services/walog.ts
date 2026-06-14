import "server-only";
import { connectDB } from "@/db/mongoose";
import { WaLog } from "@/models/WaLog";

export type WaLogItem = {
  id: string;
  phone: string;
  message: string;
  messagePreview: string;
  type: string;
  status: "sent" | "failed";
  error?: string;
  createdAt: string;
};

export type WaLogPage = {
  items: WaLogItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listWaLogs(page = 1, pageSize = 20): Promise<WaLogPage> {
  await connectDB();
  const total = await WaLog.countDocuments();
  const docs = await WaLog.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const items: WaLogItem[] = docs.map((d) => ({
    id: String(d._id),
    phone: d.phone,
    message: d.message,
    messagePreview: d.message.length > 80 ? d.message.slice(0, 80) + "…" : d.message,
    type: d.type,
    status: d.status as "sent" | "failed",
    error: d.error,
    createdAt: new Date(d.createdAt).toISOString(),
  }));

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
