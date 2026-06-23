import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchDispatchableCodes } from "@/services/dispatch";
import { QR_TYPES, inferTypeFromPrefix, type QrType } from "@/lib/qr";

export const runtime = "nodejs";

/**
 * Search undispatched QR codes for the Dispatch picker.
 * GET /api/qr/search?type=master&q=MS-DS-000  (admin only)
 * Type is auto-inferred from query prefix (MS→master, SM→small, PD→product)
 * if the explicit `type` param is absent.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type") ?? "";
  const q = searchParams.get("q") ?? "";
  const selected = searchParams.getAll("selected") ?? [];

  const explicitType = (QR_TYPES as readonly string[]).includes(typeParam)
    ? (typeParam as QrType)
    : undefined;
  const type = explicitType ?? inferTypeFromPrefix(q);

  const items = await searchDispatchableCodes({ type, query: q, limit: 10, excludeDescendantsOf: selected });
  return NextResponse.json({ items });
}
