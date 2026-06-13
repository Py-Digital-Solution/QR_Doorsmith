import "server-only";
import { connectDB } from "@/db/mongoose";
import { Return } from "@/models/Return";
import { paginated, type Pagination, type Paginated, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type ReturnDTO = {
  id: string;
  serialNo: string;
  sku: string;
  pointsReversed: number;
  khatiName: string;
  counterName: string;
  createdAt: string;
};

export async function listCounterReturns(
  counterId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
): Promise<Paginated<ReturnDTO>> {
  await connectDB();
  const q: Record<string, unknown> = { counterId };
  if (search) q.$or = [
    { serialNo: { $regex: search, $options: "i" } },
    { sku: { $regex: search, $options: "i" } },
    { khatiName: { $regex: search, $options: "i" } },
  ];
  const total = await Return.countDocuments(q);
  const { page, pageSize } = pagination;
  const docs = await Return.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      serialNo: d.serialNo,
      sku: d.sku ?? "",
      pointsReversed: d.pointsReversed,
      khatiName: d.khatiName ?? "",
      counterName: d.counterName ?? "",
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    })),
    total,
    pagination,
  );
}
